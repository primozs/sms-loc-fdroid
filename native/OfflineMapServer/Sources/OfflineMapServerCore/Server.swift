import Foundation
#if canImport(Darwin)
import Darwin
#elseif canImport(Android)
import Android
#elseif canImport(Glibc)
import Glibc
#elseif canImport(Musl)
import Musl
#endif
import Vapor

public enum OfflineMapServerError: Error {
  case hostNotLoopback
  case notListening
}

actor OfflineMapServerState {
  var app: Application?
  var runTask: Task<Void, Never>?
  var baseURL: String = ""
  /// Process-private; never published on `/healthy`.
  var ownershipToken: String = ""

  func setRunning(app: Application, baseURL: String, ownershipToken: String) {
    self.app = app
    self.baseURL = baseURL
    self.ownershipToken = ownershipToken
  }

  func setTask(_ task: Task<Void, Never>) {
    runTask = task
  }

  func takeApp() -> Application? {
    let application = app
    app = nil
    baseURL = ""
    ownershipToken = ""
    return application
  }

  func cancelTask() {
    runTask?.cancel()
    runTask = nil
  }

  func currentOwnershipToken() -> String {
    ownershipToken
  }

  func clearIfApp(_ application: Application) {
    guard app === application else { return }
    app = nil
    baseURL = ""
    ownershipToken = ""
    runTask = nil
  }
}

/// In-process static file server for offline map tiles (loopback only).
public enum OfflineMapServer {
  private static let state = OfflineMapServerState()
  // LoggingSystem.bootstrap may run only once per process (Swift tests restart the server).
  private static let loggingReady = OnceBox(false)

  public static func start(
    rootDirectory: String,
    host: String = "127.0.0.1",
    port: Int = 4000
  ) async throws {
    guard isLoopbackHost(host) else {
      throw OfflineMapServerError.hostNotLoopback
    }

    // Idempotent only if *this* process still owns the listener (token set)
    // and loopback /healthy answers — not any random 200 on the port.
    if await state.app != nil {
      let token = await state.currentOwnershipToken()
      if !token.isEmpty, await listenerHealthy(host: host, port: port) {
        return
      }
      await stop()
    }

    var env = Environment(name: "production", arguments: ["OfflineMapServer"])
    if !loggingReady.get() {
      try LoggingSystem.bootstrap(from: &env)
      loggingReady.set(true)
    }

    let application = try await Application.make(env)
    application.http.server.configuration.hostname = host
    application.http.server.configuration.port = port
    // Capacitor WebView is https://localhost — MapLibre needs CORS to read loopback.
    application.middleware.use(
      CORSMiddleware(
        configuration: .init(
          allowedOrigin: .any([
            "https://localhost",
            "http://localhost",
            "capacitor://localhost",
          ]),
          allowedMethods: [.GET, .HEAD, .OPTIONS],
          allowedHeaders: [.accept, .contentType, .origin, .userAgent]
        )
      ),
      at: .beginning
    )
    application.middleware.use(FileMiddleware(publicDirectory: rootDirectory))

    application.get("healthy") { _ -> [String: String] in
      let now = Date()
      let ts = Int(now.timeIntervalSince1970 * 1000)
      return [
        "now": ISO8601DateFormatter().string(from: now),
        "ts": String(ts),
      ]
    }

    let executeDone = OnceBox(false)
    let task = Task {
      defer { executeDone.set(true) }
      do {
        try await application.execute()
      } catch {
        application.logger.error(
          "OfflineMapServer stopped: \(String(reflecting: error))"
        )
      }
      await state.clearIfApp(application)
    }

    var listening = false
    for _ in 0..<25 {
      try await Task.sleep(nanoseconds: 40_000_000)
      if executeDone.get() { break }
      if await listenerHealthy(host: host, port: port) {
        listening = !executeDone.get()
        break
      }
    }

    if !listening {
      try? await application.asyncShutdown()
      task.cancel()
      await state.clearIfApp(application)
      throw OfflineMapServerError.notListening
    }

    let url = "http://\(host):\(port)"
    await state.setRunning(
      app: application,
      baseURL: url,
      ownershipToken: UUID().uuidString
    )
    await state.setTask(task)
  }

  public static func stop() async {
    let application = await state.takeApp()
    guard let application else { return }
    try? await application.asyncShutdown()
    await state.cancelTask()
  }

  public static func getBaseURL() async -> String {
    await state.baseURL
  }

  public static func getOwnershipToken() async -> String {
    await state.currentOwnershipToken()
  }

  private static func isLoopbackHost(_ host: String) -> Bool {
    host == "127.0.0.1"
  }

  private static func listenerHealthy(host: String, port: Int) async -> Bool {
    // Android Swift SDK has no URLSession — probe with a raw loopback HTTP GET.
    await Task.detached(priority: .userInitiated) {
      loopbackHealthyGet(host: host, port: port)
    }.value
  }
}

/// Minimal GET /healthy over TCP. Avoids FoundationNetworking (missing on Android SDK).
private func loopbackHealthyGet(host: String, port: Int) -> Bool {
  guard host == "127.0.0.1", port > 0, port <= 65_535 else { return false }

  #if canImport(Darwin)
  let sockType = SOCK_STREAM
  #elseif canImport(Glibc)
  let sockType = Int32(SOCK_STREAM.rawValue)
  #else
  let sockType = SOCK_STREAM
  #endif

  let fd = socket(AF_INET, sockType, 0)
  guard fd >= 0 else { return false }
  defer { close(fd) }

  var tv = timeval(tv_sec: 0, tv_usec: 200_000)
  _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
  _ = setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

  var addr = sockaddr_in()
  addr.sin_family = sa_family_t(AF_INET)
  addr.sin_port = in_port_t(UInt16(port).bigEndian)
  addr.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))

  let connectRc = withUnsafePointer(to: &addr) { ptr in
    ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) {
      connect(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
    }
  }
  guard connectRc == 0 else { return false }

  let req = "GET /healthy HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
  let sent = req.withCString { cstr in
    send(fd, cstr, strlen(cstr), 0)
  }
  guard sent > 0 else { return false }

  var buf = [CChar](repeating: 0, count: 512)
  let n = recv(fd, &buf, buf.count - 1, 0)
  guard n > 0 else { return false }
  let text = String(cString: buf)
  // Require our /healthy JSON shape — not any random HTTP 200 on the port.
  let okStatus = text.hasPrefix("HTTP/1.1 200") || text.hasPrefix("HTTP/1.0 200")
  return okStatus && text.contains("\"ts\"")
}

// MARK: - C ABI for JNI shim / CLI tools

private final class OnceBox<T>: @unchecked Sendable {
  private let lock = NSLock()
  private var storage: T
  init(_ value: T) { storage = value }
  func set(_ value: T) {
    lock.lock()
    storage = value
    lock.unlock()
  }
  func get() -> T {
    lock.lock()
    defer { lock.unlock() }
    return storage
  }
}

@_cdecl("offline_map_server_start")
public func offline_map_server_start(
  _ rootDir: UnsafePointer<CChar>?,
  _ host: UnsafePointer<CChar>?,
  _ port: Int32
) -> Int32 {
  guard let rootDir else { return 1 }
  let root = String(cString: rootDir)
  let hostname = host.map { String(cString: $0) } ?? "127.0.0.1"
  let p = port > 0 ? Int(port) : 4000

  let sem = DispatchSemaphore(value: 0)
  let result = OnceBox<Int32>(0)
  Task {
    do {
      try await OfflineMapServer.start(
        rootDirectory: root,
        host: hostname,
        port: p
      )
      result.set(0)
    } catch {
      result.set(2)
    }
    sem.signal()
  }
  sem.wait()
  return result.get()
}

@_cdecl("offline_map_server_stop")
public func offline_map_server_stop() {
  let sem = DispatchSemaphore(value: 0)
  Task {
    await OfflineMapServer.stop()
    sem.signal()
  }
  sem.wait()
}

@_cdecl("offline_map_server_base_url")
public func offline_map_server_base_url(
  _ out: UnsafeMutablePointer<CChar>?,
  _ outLen: Int32
) -> Int32 {
  copyCString(awaiting: { await OfflineMapServer.getBaseURL() }, out: out, outLen: outLen)
}

@_cdecl("offline_map_server_ownership_token")
public func offline_map_server_ownership_token(
  _ out: UnsafeMutablePointer<CChar>?,
  _ outLen: Int32
) -> Int32 {
  copyCString(
    awaiting: { await OfflineMapServer.getOwnershipToken() },
    out: out,
    outLen: outLen
  )
}

private func copyCString(
  awaiting: @escaping @Sendable () async -> String,
  out: UnsafeMutablePointer<CChar>?,
  outLen: Int32
) -> Int32 {
  guard let out, outLen > 1 else { return 1 }

  let sem = DispatchSemaphore(value: 0)
  let box = OnceBox<String>("")
  Task {
    box.set(await awaiting())
    sem.signal()
  }
  sem.wait()

  let value = box.get()
  guard !value.isEmpty else {
    out[0] = 0
    return 2
  }
  let max = Int(outLen) - 1
  let bytes = Array(value.utf8.prefix(max))
  for (i, b) in bytes.enumerated() {
    out[i] = CChar(bitPattern: b)
  }
  out[bytes.count] = 0
  return 0
}

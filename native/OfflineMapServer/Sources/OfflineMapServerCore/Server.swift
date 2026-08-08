import Foundation
import Vapor

actor OfflineMapServerState {
  var app: Application?
  var runTask: Task<Void, Never>?
  var baseURL: String = ""

  func setRunning(app: Application, baseURL: String) {
    self.app = app
    self.baseURL = baseURL
  }

  func setTask(_ task: Task<Void, Never>) {
    runTask = task
  }

  func takeApp() -> Application? {
    let application = app
    app = nil
    baseURL = ""
    return application
  }

  func cancelTask() {
    runTask?.cancel()
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
    if await state.app != nil {
      return
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
          allowedOrigin: .all,
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
        "root": rootDirectory,
      ]
    }

    let url = "http://\(host):\(port)"
    await state.setRunning(app: application, baseURL: url)

    let task = Task {
      do {
        try await application.execute()
      } catch {
        application.logger.error(
          "OfflineMapServer stopped: \(String(reflecting: error))"
        )
      }
    }
    await state.setTask(task)

    // Brief settle so callers can GET immediately after start returns.
    try await Task.sleep(nanoseconds: 200_000_000)
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
  guard let out, outLen > 1 else { return 1 }

  let sem = DispatchSemaphore(value: 0)
  let urlBox = OnceBox<String>("")
  Task {
    urlBox.set(await OfflineMapServer.getBaseURL())
    sem.signal()
  }
  sem.wait()

  let url = urlBox.get()
  guard !url.isEmpty else {
    out[0] = 0
    return 2
  }
  let max = Int(outLen) - 1
  let bytes = Array(url.utf8.prefix(max))
  for (i, b) in bytes.enumerated() {
    out[i] = CChar(bitPattern: b)
  }
  out[bytes.count] = 0
  return 0
}

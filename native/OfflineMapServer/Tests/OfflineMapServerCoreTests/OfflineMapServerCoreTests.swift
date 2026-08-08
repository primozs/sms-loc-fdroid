import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import OfflineMapServerCore
import XCTest

final class OfflineMapServerCoreTests: XCTestCase {
  private var root: String!
  private var parent: String!
  private var port: Int = 0

  override func setUpWithError() throws {
    // Unique port per test — OfflineMapServer is a process-wide singleton.
    port = 41_000 + Int.random(in: 0..<1_000)

    let parentURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("oms-\(UUID().uuidString)", isDirectory: true)
    let publicURL = parentURL.appendingPathComponent("public", isDirectory: true)
    try FileManager.default.createDirectory(at: publicURL, withIntermediateDirectories: true)
    let styleDir = publicURL.appendingPathComponent("styles/fixture", isDirectory: true)
    try FileManager.default.createDirectory(at: styleDir, withIntermediateDirectories: true)
    try #"{ "version": 8, "name": "t", "sources": {}, "layers": [] }"#
      .write(
        to: styleDir.appendingPathComponent("style.json"),
        atomically: true,
        encoding: .utf8
      )
    // Sibling of public root — must not be served via `..`.
    try "SECRET".write(
      to: parentURL.appendingPathComponent("secret.txt"),
      atomically: true,
      encoding: .utf8
    )
    parent = parentURL.path
    root = publicURL.path
  }

  override func tearDown() {
    let sem = DispatchSemaphore(value: 0)
    Task {
      await OfflineMapServer.stop()
      sem.signal()
    }
    _ = sem.wait(timeout: .now() + 5)
    if let parent {
      try? FileManager.default.removeItem(atPath: parent)
    }
  }

  func testFixtureStyleAndHealthyReturn200() async throws {
    try await OfflineMapServer.start(
      rootDirectory: root,
      host: "127.0.0.1",
      port: port
    )
    let healthy = try await httpGet("http://127.0.0.1:\(port)/healthy")
    XCTAssertEqual(healthy.status, 200)
    XCTAssertTrue(healthy.body.contains("ts"))

    let style = try await httpGet(
      "http://127.0.0.1:\(port)/styles/fixture/style.json"
    )
    XCTAssertEqual(style.status, 200)
    XCTAssertTrue(style.body.contains("version"))
  }

  func testMissingPathReturns404() async throws {
    try await OfflineMapServer.start(
      rootDirectory: root,
      host: "127.0.0.1",
      port: port
    )
    let missing = try await httpGet(
      "http://127.0.0.1:\(port)/styles/fixture/nope.json"
    )
    XCTAssertEqual(missing.status, 404)
  }

  func testPathTraversalRejected() async throws {
    try await OfflineMapServer.start(
      rootDirectory: root,
      host: "127.0.0.1",
      port: port
    )
    let probes = [
      "http://127.0.0.1:\(port)/../secret.txt",
      "http://127.0.0.1:\(port)/styles/fixture/../../secret.txt",
      "http://127.0.0.1:\(port)/styles/fixture/%2e%2e/%2e%2e/secret.txt",
    ]
    for url in probes {
      let res = try await httpGet(url)
      XCTAssertNotEqual(res.status, 200, "traversal leaked for \(url)")
      XCTAssertFalse(
        res.body.contains("SECRET"),
        "traversal body leaked for \(url)"
      )
    }
  }

  func testStopEndsListener() async throws {
    try await OfflineMapServer.start(
      rootDirectory: root,
      host: "127.0.0.1",
      port: port
    )
    let before = try await httpGet("http://127.0.0.1:\(port)/healthy")
    XCTAssertEqual(before.status, 200)
    await OfflineMapServer.stop()
    do {
      _ = try await httpGet("http://127.0.0.1:\(port)/healthy")
      XCTFail("expected connection failure after stop")
    } catch {
      // connection refused / reset
    }
  }
}

private struct HttpResult {
  var status: Int
  var body: String
}

private func httpGet(_ url: String) async throws -> HttpResult {
  try await withCheckedThrowingContinuation { cont in
    let task = URLSession.shared.dataTask(with: URL(string: url)!) { data, response, error in
      if let error {
        cont.resume(throwing: error)
        return
      }
      let http = response as! HTTPURLResponse
      cont.resume(
        returning: HttpResult(
          status: http.statusCode,
          body: String(data: data ?? Data(), encoding: .utf8) ?? ""
        )
      )
    }
    task.resume()
  }
}

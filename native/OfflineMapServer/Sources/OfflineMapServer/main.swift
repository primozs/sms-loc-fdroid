import Foundation
import OfflineMapServerCore

@main
enum OfflineMapServerCLI {
  static func main() async throws {
    let root =
      ProcessInfo.processInfo.environment["OFFLINE_MAP_ROOT"]
      ?? FileManager.default.currentDirectoryPath + "/Public"
    let host =
      ProcessInfo.processInfo.environment["OFFLINE_MAP_HOST"] ?? "127.0.0.1"
    let port =
      ProcessInfo.processInfo.environment["OFFLINE_MAP_PORT"].flatMap(Int.init)
      ?? 4000

    try await OfflineMapServer.start(
      rootDirectory: root,
      host: host,
      port: port
    )

    let base = await OfflineMapServer.getBaseURL()
    print("OfflineMapServer listening on \(base) root=\(root)")

    // Keep CLI alive until SIGINT / process kill.
    try await Task.sleep(nanoseconds: UInt64.max / 2)
  }
}

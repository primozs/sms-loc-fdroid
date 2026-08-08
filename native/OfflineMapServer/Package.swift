// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "OfflineMapServer",
  platforms: [
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "OfflineMapServerCore",
      type: .dynamic,
      targets: ["OfflineMapServerCore"]
    ),
    .executable(
      name: "OfflineMapServer",
      targets: ["OfflineMapServer"]
    ),
  ],
  dependencies: [
    .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0"),
  ],
  targets: [
    .target(
      name: "OfflineMapServerCore",
      dependencies: [
        .product(name: "Vapor", package: "vapor"),
      ]
    ),
    .executableTarget(
      name: "OfflineMapServer",
      dependencies: [
        "OfflineMapServerCore",
      ]
    ),
    .testTarget(
      name: "OfflineMapServerCoreTests",
      dependencies: [
        "OfflineMapServerCore",
      ]
    ),
  ]
)

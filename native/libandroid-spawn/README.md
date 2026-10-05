# libandroid-spawn (vendored source)

BSD-2-Clause `posix_spawn` implementation used on Android (AOSP / Termux
`libandroid-spawn` 0.3).

Source: [termux/termux-packages `packages/libandroid-spawn`](https://github.com/termux/termux-packages/tree/master/packages/libandroid-spawn)
(not the `packages.termux.dev` binary `.deb`).

Built by `scripts/build-libandroid-spawn.sh` into a 16KB-page
`libandroid-spawn.so` for OfflineMapServer JNI packaging and the Swift
Android SDK sysroot.

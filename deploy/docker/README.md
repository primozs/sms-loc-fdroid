# smsloc docker build

This docker image when build, will compile mobile apk in a clean environment.

## Swift Android SDK image (from source, optional)

Intermediate image that runs
[`scripts/build-swift-android-sdk.sh`](../../scripts/build-swift-android-sdk.sh)
so local/CI (and other apps) can reuse a rebuilt aarch64 SDK without waiting
~30 minutes each time. **F-Droid must not use this image** — see
[`docs/fdroid.md`](../../docs/fdroid.md).

```sh
docker build -f deploy/docker/swift-android-sdk/Dockerfile \
  -t ghcr.io/primozs/sms-loc-fdroid/swift-android-sdk:6.2.3-aarch64-api24 .

# Extract the artifactbundle tarball:
docker create --name sdk ghcr.io/primozs/sms-loc-fdroid/swift-android-sdk:6.2.3-aarch64-api24
docker cp sdk:/opt/swift-android-sdk.artifactbundle.tar.gz .
docker rm sdk
```

GitHub Actions workflow: `.github/workflows/swift-android-sdk.yml` (GHCR push).

## to build the container image

```sh
yarn docker:build
```

## generate keystore for apk signing

Key will be stored in `/keystores` folder.

```sh
yarn docker:generate:keystore

# after create file /keystores/password with a single line password
# this is used in app-compile.sh, with apksigner file:keystores/password
```

## compile apk, aab

```sh
yarn docker:compile
```

## to run container interactively

```sh
yarn docker:interactive
```

## resources

- [capacitor google play](https://capacitorjs.com/docs/main/deployment/play-store)
- [deploying capacitor apps](https://www.joshmorony.com/deploying-capacitor-applications-to-android-development-distribution/)
- [android publish your app](https://developer.android.com/studio/publish)
- [command line tools](https://developer.android.com/studio/command-line#tools-sdk)

## versioning

- \android\app\build.gradle versionCode 2, versionName "1.0.2"
- [android versioning](https://developer.android.com/studio/publish/versioning)

## sign your app

- [sign your app](https://developer.android.com/studio/publish/app-signing)
- [keytool](https://docs.oracle.com/javase/6/docs/technotes/tools/windows/keytool.html)
- [keytool example](https://medium.com/modulotech/how-to-sign-an-unsigned-apk-using-command-line-636a056373a0)

## native configurations

- [trapeze](https://trapeze.dev/docs/Operations/android)

## apk size

- [making-the-most-of-the-apk-analyzer](https://medium.com/androiddevelopers/making-the-most-of-the-apk-analyzer-c066cb871ea2)
- [configure-apk-splits](https://developer.android.com/build/configure-apk-splits)
- [controlling-apk-size-when-using-native-libraries](https://medium.com/android-news/controlling-apk-size-when-using-native-libraries-45c6c0e5b70a)

## android api levels

- [api levels list](https://apilevels.com/)

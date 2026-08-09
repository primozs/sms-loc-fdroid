# Intermediate image: Swift Android SDK built from source (aarch64).
# For local/CI/other-apps fast path — F-Droid does NOT use this image.
#
# Build (from repo root):
#   docker build -f deploy/docker/swift-android-sdk/Dockerfile \
#     -t ghcr.io/primozs/sms-loc-fdroid/swift-android-sdk:6.3.3-aarch64-api24 .
#
# Export artifactbundle tarball:
#   docker create --name sdk ghcr.io/.../swift-android-sdk:6.3.3-aarch64-api24
#   docker cp sdk:/opt/swift-android-sdk.artifactbundle.tar.gz .
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    SWIFT_VER=6.3.3 \
    SWIFT_TAG=swift-6.3.3-RELEASE \
    ANDROID_ARCH=aarch64 \
    ANDROID_API=24 \
    SMSLOC_SWIFT_CACHE=/opt/smsloc-swift \
    SMSLOC_SWIFT_SDK_KEEP_WORK=0 \
    PATH=/root/.local/bin:/usr/local/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils unzip git \
      build-essential clang ninja-build \
      python3 python-is-python3 \
      libncurses6 libcurl4 libxml2 libsqlite3-0 zlib1g libedit2 \
      patchelf perl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /tmp/cmake.tgz \
         https://github.com/Kitware/CMake/releases/download/v3.30.5/cmake-3.30.5-linux-x86_64.tar.gz \
    && tar -xzf /tmp/cmake.tgz -C /opt \
    && ln -s /opt/cmake-3.30.5-linux-x86_64/bin/cmake /usr/local/bin/cmake \
    && ln -s /opt/cmake-3.30.5-linux-x86_64/bin/cpack /usr/local/bin/cpack \
    && ln -s /opt/cmake-3.30.5-linux-x86_64/bin/ctest /usr/local/bin/ctest \
    && rm /tmp/cmake.tgz

WORKDIR /src
COPY scripts/build-swift-android-sdk.sh /src/scripts/build-swift-android-sdk.sh
COPY native/OfflineMapServer/swift-android-sdk /src/native/OfflineMapServer/swift-android-sdk
RUN chmod +x /src/scripts/build-swift-android-sdk.sh \
    && /src/scripts/build-swift-android-sdk.sh \
    && cp -a "${SMSLOC_SWIFT_CACHE}/${SWIFT_TAG}-android-${ANDROID_API}-0.1.artifactbundle.tar.gz" \
         /opt/swift-android-sdk.artifactbundle.tar.gz \
    && ln -sfn "${SMSLOC_SWIFT_CACHE}/${SWIFT_TAG}-android-${ANDROID_API}-0.1.artifactbundle" \
         /opt/swift-android-sdk.artifactbundle

LABEL org.opencontainers.image.title="smsloc-swift-android-sdk" \
      org.opencontainers.image.description="From-source Swift Android SDK (aarch64) for SMSLoc / case study reuse" \
      org.opencontainers.image.source="https://github.com/primozs/sms-loc-fdroid"

CMD ["bash", "-lc", "ls -la /opt/swift-android-sdk.artifactbundle && ls /opt/*.tar.gz"]

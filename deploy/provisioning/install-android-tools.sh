#!/bin/sh

set -e

# set ANDROID variables
ANDROID_SDK_TOOLS_VERSION=11076708_latest
ANDROID_BUILD_TOOLS_VERSION=35.0.0
ANDROID_PLATFORM_VERSION=35
ANDROID_REPO_URL=https://dl.google.com/android/repository
ANDROID_SDK_DIR=~/opt/android-sdk-linux

if [ -d "${ANDROID_SDK_DIR}"/build-tools/"${ANDROID_BUILD_TOOLS_VERSION}" ]
then
  echo "Not installing Android SDK, because ${ANDROID_SDK_DIR}/build-tools/${ANDROID_BUILD_TOOLS_VERSION} exists already"
else
  echo "Installing Android SDK to ${ANDROID_SDK_DIR}..."

  ANDROID_SDK_TMP_ZIP="$(mktemp)"
  wget --progress=bar:force:noscroll \
      ${ANDROID_REPO_URL}/commandlinetools-linux-${ANDROID_SDK_TOOLS_VERSION}.zip \
      -O "${ANDROID_SDK_TMP_ZIP}"

  mkdir -p "${ANDROID_SDK_DIR}"/licenses
  cd "${ANDROID_SDK_DIR}"
  unzip "${ANDROID_SDK_TMP_ZIP}"

  rm "${ANDROID_SDK_TMP_ZIP}"

  echo 24333f8a63b6825ea9c5514f83c2829b004d1fee > licenses/android-sdk-license       
fi
echo

cd "${ANDROID_SDK_DIR}"
echo Installing Android SDK packages...
echo cmdline-tools/bin/sdkmanager --sdk_root="${ANDROID_SDK_DIR}" \
    "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" "platforms;android-${ANDROID_PLATFORM_VERSION}"
cmdline-tools/bin/sdkmanager --sdk_root=${ANDROID_SDK_DIR} \
    "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" "platforms;android-${ANDROID_PLATFORM_VERSION}"
echo

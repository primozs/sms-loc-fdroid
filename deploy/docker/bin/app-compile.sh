#!/bin/sh

# build web
yarn install
yarn configure:prod -y
yarn ionic-sync

# build apk
# https://forum.ionicframework.com/t/how-to-build-an-android-apk-file-without-using-android-studio-in-a-capacitor-project/177814/9

export ANDROID_HOME=~/opt/android-sdk-linux

ANDROID_BUILD_TOOLS_VERSION=33.0.1
ANDROID_SDK_PLATFORM=android-32

ANDROID_SDK_PLATFORM_DIR=${ANDROID_HOME}/platforms/${ANDROID_SDK_PLATFORM}
ANDROID_BUILD_TOOLS_DIR=${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS_VERSION}
OUTPUT_DIR=./android/app/build/outputs/apk/release
OUTPUT_BUNDLE_DIR=./android/app/build/outputs/bundle/release

export PATH="${ANDROID_BUILD_TOOLS_DIR}:${ANDROID_SDK_PLATFORM_DIR}:${PATH}"

rm -rf $OUTPUT_DIR
rm -rf $OUTPUT_BUNDLE_DIR
cd android 
./gradlew assembleRelease
./gradlew bundleRelease
cd ..

# sign apk
# https://stackoverflow.com/questions/10930331/how-to-sign-an-already-compiled-apk
# https://developer.android.com/studio/command-line/apksigner
# https://developer.android.com/studio/command-line/zipalign

echo sign apk
echo zipalign
zipalign -p 4 ${OUTPUT_DIR}/app-release-unsigned.apk ${OUTPUT_DIR}/app-release-aligned.apk

echo zipalign verify
zipalign -c 4 ${OUTPUT_DIR}/app-release-aligned.apk

echo apk sign
apksigner sign --ks-key-alias release --ks-pass file:keystores/password --ks keystores/release.keystore ${OUTPUT_DIR}/app-release-aligned.apk

# https://stackoverflow.com/questions/52122546/apk-metainfo-warning
echo apk sign verify
apksigner verify ${OUTPUT_DIR}/app-release-aligned.apk

rm -rf ${OUTPUT_DIR}/app-release-unsigned.apk
rm -rf ${OUTPUT_DIR}/app-release-aligned.apk.idsig
mv ${OUTPUT_DIR}/app-release-aligned.apk ${OUTPUT_DIR}/app-release.apk

echo sign bundle
STORE_PASSWORD=`cat keystores/password` 
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore keystores/release.keystore -signedjar ${OUTPUT_BUNDLE_DIR}/app-release-signed.aab ${OUTPUT_BUNDLE_DIR}/app-release.aab release -storepass ${STORE_PASSWORD}

rm -rf ${OUTPUT_BUNDLE_DIR}/app-release.aab
mv ${OUTPUT_BUNDLE_DIR}/app-release-signed.aab ${OUTPUT_BUNDLE_DIR}/app-release.aab

echo apk has been generated:
echo ${OUTPUT_DIR}/app-release.apk

echo bundle has been generated:
echo ${OUTPUT_BUNDLE_DIR}/app-release.aab

# set back to dev, this is here because prod config changes some files under source control: build.gradle ... possibly others in the future
yarn configure:dev -y
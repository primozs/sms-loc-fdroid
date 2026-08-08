#!/bin/sh

# version number from package.json
export PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

# Stable versionCode from android/app/build.gradle (F-Droid UpdateCheckMode).
# Override with BUILD_NUMBER=… when bumping a release before tagging.
if [ -z "${BUILD_NUMBER:-}" ]; then
  BUILD_NUMBER=$(grep -E '^\s*versionCode\s+[0-9]+' android/app/build.gradle \
    | head -1 \
    | awk '{print $2}')
fi
export BUILD_NUMBER

# Gitignored local overrides; F-Droid / clean CI only have the example.
if [ ! -f config/prod/index.ts ]; then
  cp config/prod/index.example.ts config/prod/index.ts
fi

trapeze run ./config/build-config.prod.yml --android-project android "$@"

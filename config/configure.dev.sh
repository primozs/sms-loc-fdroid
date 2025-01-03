#!/bin/sh

export PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

# development build number allways 1
export BUILD_NUMBER=1

trapeze run ./config/build-config.dev.yml --android-project android "$@"
#!/bin/sh

# version number from package.json
export PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

# build number unix timesamp
export BUILD_NUMBER=$(date +%s);

trapeze run ./config/build-config.prod.yml --android-project android "$@"
#!/bin/sh

echo "MOBILE BUILD INTERACTIVE"
TAG="smsloc-mobile-build:latest"

docker run --rm \
  --mount type=bind,source="$(pwd)",target=/opt/app \
  -it $TAG /bin/bash
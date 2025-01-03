#!/bin/sh

echo "MOBILE COMPILE APP"
TAG="smsloc-mobile-build:latest"

docker run --rm \
  --mount type=bind,source="$(pwd)",target=/opt/app \
  -it $TAG \
  app-compile.sh "$@"
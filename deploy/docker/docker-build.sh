#!/bin/sh

echo "MOBILE BUILD IMAGE"
TAG="smsloc-mobile-build:latest"

docker build --file deploy/docker/Dockerfile -t $TAG ./deploy/

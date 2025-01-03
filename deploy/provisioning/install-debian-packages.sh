#!/bin/bash

set -e

# Variables
NODE_VERSION=18.x
NPM_VERSION=9.8.0
YARN_VERSION=1.22.19
IONIC_CLI_VERSION=7.1.1

export DEBIAN_FRONTEND=noninteractive
declare -A APTOPTS
APTOPTS[1]="--assume-yes"
APTOPTS[2]="--no-install-recommends"

echo Updating Repositories
apt-get update

echo Installing base dependencies...
apt-get install ${APTOPTS[*]} \
  git zip wget curl ca-certificates
echo

echo Installing node and dependencies ... 
# https://github.com/nodesource/distributions/blob/master/README.md#debian-and-ubuntu-based-distributions
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - &&\
apt-get install ${APTOPTS[*]} nodejs

echo Node version:
node -v 

echo Installing npm:
npm install -g npm@${NPM_VERSION}
echo Npm version:
npm -v 

echo Installing yarn:
npm install -g yarn@${YARN_VERSION}
echo Yarn version:
yarn -v

echo Installing ionic cli:
npm install -g @ionic/cli@${IONIC_CLI_VERSION}
echo Ionic cli version:
ionic -v 

echo 

echo Installing dependencies for the Android target, not including SDK
apt-get install ${APTOPTS[*]} openjdk-17-jdk-headless vorbis-tools adb libtool unzip
echo

echo Clean up downloaded resources in order to free space
apt-get clean
echo

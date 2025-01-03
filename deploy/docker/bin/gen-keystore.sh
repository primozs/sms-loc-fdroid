#!/bin/sh

echo "GENERATE RELEASE KEYSTORE"

if [ -d "keystores" ]
then
  echo "keystores folder exists"
else
  mkdir keystores
fi 

keytool -genkey -v -keystore keystores/release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
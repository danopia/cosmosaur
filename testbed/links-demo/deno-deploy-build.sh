#!/bin/sh -eux

if ! which meteor
then
  Release="$(cut -d@ -f2 < .meteor/release)"
  curl https://install.meteor.com/\?release\="$Release" | sh
  # hangs: npx meteor@"$(cut -d@ -f2 < .meteor/release)"
fi

HadNoDeps=""
if ! [ -d node_modules ]
then
  meteor npm ci
  HadNoDeps="true"
fi

rm -rf ./meteor-build
TempDir="$(mktemp -d)"

meteor build \
  --directory "$TempDir" \
  --platforms web.browser

mv "$TempDir" ./meteor-build

cat ./meteor-build/bundle/programs/web.browser/body.html
cat ./meteor-build/bundle/programs/web.browser/head.html
cat ./meteor-build/bundle/programs/server/config.json
find ./meteor-build/bundle/programs/web.browser

if [ -z "$HadNoDeps" ]
then
  rm -rf node_modules
  rm -rf meteor-build/bundle/programs/server
fi

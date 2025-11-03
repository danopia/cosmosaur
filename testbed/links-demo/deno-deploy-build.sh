#!/bin/sh -eux

if ! which meteor
then
  npx meteor@"$(cut -d@ -f2 < .meteor/release)"
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

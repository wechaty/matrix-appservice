#!/usr/bin/env bash
set -e

VERSION=$(npx pkg-jq -r .version)

if npx --package @chatie/semver semver-is-prod "$VERSION"; then
  NPM_TAG=latest
else
  NPM_TAG=next
fi

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
trap "rm -fr '$TMPDIR'" EXIT

mv ./*-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR

npm init -y
npm install --production ./*-*.*.*.tgz \
  @chatie/tsconfig@$NPM_TAG \
  pkg-jq \
  qrcode-terminal \

#
# CommonJS
#
npx tsc \
  --target es6 \
  --module CommonJS \
  \
  --moduleResolution node \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "CommonJS: pack testing..."
node smoke-testing.js

#
# ES Modules
#
npx pkg-jq -i '.type="module"'

npx tsc \
  --target es2020 \
  --module es2020 \
  \
  --moduleResolution node \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js

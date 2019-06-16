#!/usr/bin/env bash
set -e

npm run dist
npm run pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv *-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

pushd "$TMPDIR"

npm init -y
npm install --production \
  *-*.*.*.tgz \
  @chatie/tsconfig

npx tsc \
  --lib esnext \
  --strict \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

node smoke-testing.js

popd
rm -fr "$TMPDIR"

#!/usr/bin/env bash

set -eo pipefail

APP_SERVER_ENDPOINT='http://localhost:8788'

ts-node ../bin/matrix-appservice-wechaty \
  --config config.yaml \
  --generate-registration \
  --url "$APP_SERVER_ENDPOINT"
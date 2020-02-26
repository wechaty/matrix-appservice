#!/usr/bin/env bash

set -eo pipefail

source .env

ts-node ../bin/matrix-appservice-wechaty \
  --config config.yaml \
  --generate-registration \
  --url "$APP_SERVER_ENDPOINT"
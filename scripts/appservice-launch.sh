#!/usr/bin/env bash

set -eo pipefail

export WECHATY_LOG=silly
export APP_SERVICE_PORT=80

ts-node ../bin/matrix-appservice-wechaty \
  --config config.yaml \
  --file wechaty-registration.yaml
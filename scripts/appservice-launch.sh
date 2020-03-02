#!/usr/bin/env bash

set -eo pipefail

source ../.env

export WECHATY_LOG=silly
# export WECHATY_PUPPET=wechaty-puppet-padplus
# export WECHATY_PUPPET_PADPLUS_TOKEN=xxxx

ts-node ../bin/matrix-appservice-wechaty \
  --config config.yaml \
  --file wechaty-registration.yaml

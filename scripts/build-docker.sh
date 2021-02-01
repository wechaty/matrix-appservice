#!/usr/bin/env bash

chmod 600 node_modules/node-jq/bin/jq
chmod +x node_modules/node-jq/bin/jq

set -eo pipefail

docker build -t appservice .

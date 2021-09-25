#!/usr/bin/env sh

cd $(dirname $0)

export HOST=localhost # your domain name. See: <https://matrix-org.github.io/synapse/latest/federate.html> SYNAPSE_SERVER_NAME
export SYNAPSE_USER_NAME=test
export SYNAPSE_USER_PASSWD=passwd

docker volume rm devcontainer_synapse
docker volume create --name=devcontainer_synapse

echo 'generate the config file of Synapse. ref:<https://github.com/matrix-org/synapse/blob/develop/docker/README.md#generating-a-configuration-file>'
docker-compose -f docker-compose.init.yml run --rm -e SYNAPSE_SERVER_NAME=$HOST \
-e SYNAPSE_REPORT_STATS=yes synapse generate

echo 'prepare matrix-appservice-wechaty config file'
docker-compose -f docker-compose.init.yml run --rm --entrypoint sh matrix-appservice-wechaty \
-c "echo \"domain: $HOST
homeserverUrl: http://synapse:8008
registration: wechaty-registration.yaml\" > /data/wechaty-config.yaml"

echo 'generate the config file of matrix bridge.'
docker-compose -f docker-compose.init.yml run --rm matrix-appservice-wechaty --config /data/wechaty-config.yaml \
--url http://matrix-appservice-wechaty:8788 --generate-registration

echo 'add wechaty-registration.yaml to homeserver.yaml'
docker-compose -f docker-compose.init.yml run --rm --entrypoint sed synapse \
-e 's/#app_service_config_files/app_service_config_files/' \
-e '/app_service_config_files/a\  - \/wechaty\/wechaty-registration.yaml' \
-i /data/homeserver.yaml

echo 'run server'
docker-compose -f docker-compose.init.yml up -d

echo 'create a synapse user'
sleep 5
docker-compose -f docker-compose.init.yml exec synapse register_new_matrix_user http://localhost:8008 -c /data/homeserver.yaml -u $SYNAPSE_USER_NAME -p $SYNAPSE_USER_PASSWD --no-admin

docker-compose -f docker-compose.init.yml down

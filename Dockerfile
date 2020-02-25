# Matrix Appservice Wechaty
# https://github.com/huan/matrix-appservice-wechaty
# Copyright 2019, Huan LI <zixia@zixia.net>
#
FROM zixia/wechaty
LABEL maintainer="Huan LI <zixia@zixia.net>"

RUN sudo apt-get update \
    && sudo apt-get install -y --no-install-recommends \
      build-essential \
      dumb-init \
      git \
      jq \
      moreutils \
    && sudo apt-get purge --auto-remove \
    && sudo rm -rf /tmp/* /var/lib/apt/lists/*

RUN [ -e /data ] || sudo mkdir /data \
  && sudo chown -R "$(id -nu)" /data
VOLUME /data

RUN [ -e /matrix-appservice-wechaty ] || sudo mkdir /matrix-appservice-wechaty \
  && sudo chown -R "$(id -nu)" /matrix-appservice-wechaty

WORKDIR /matrix-appservice-wechaty

COPY package.json .
RUN sudo chown "$(id -nu)" package.json \
  && npm install \
  && rm -fr /tmp/* ~/.npm

COPY . .
RUN npm run dist

ENTRYPOINT [ "/usr/bin/dumb-init", "--", "node", "dist/bin/matrix-appservice-wechaty" ]

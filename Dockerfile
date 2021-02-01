#
# Wechat Matrix Appservice Bridge
#
#   GitHub:     https://github.com/wechaty/matrix-appservice-wechaty
#   License:    Apache-2.0
#   Copyright:  2019, Huan LI <zixia@zixia.net>
#
FROM wechaty/wechaty
LABEL maintainer="Huan LI (李卓桓) <zixia@zixia.net>"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      dumb-init \
      git \
      jq \
      moreutils \
    && apt-get purge --auto-remove \
    && rm -rf /tmp/* /var/lib/apt/lists/*

WORKDIR /matrix-appservice-wechaty

COPY package.json .
RUN npm install \
  && rm -fr /tmp/* ~/.npm

COPY . .
RUN npm test \
  && ./scripts/generate-version.sh \
  && npm run dist \
  && npm link

WORKDIR /data
VOLUME /data

EXPOSE 8788/tcp

ENTRYPOINT ["/usr/bin/dumb-init", "--", "matrix-appservice-wechaty" ]
CMD [ "" ]

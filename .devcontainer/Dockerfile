# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.194.0/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 16, 14, 12
ARG VARIANT="16-buster"
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>
# RUN apt-get update
# apt install chrome
# ldd chrome
# ...
RUN apt-get update && \
    apt install -y libasound2 libatspi2.0-0 libcairo2 libpango-1.0-0 libgbm1 libxshmfence1 \
    libnss3 libnspr4 libatk1.0-0 libxrandr2 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxdamage1 libxext6 libxfixes3 libdbus-1-3 libxcb1 libxkbcommon0 libx11-6 libxcomposite1

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node packages
# RUN su node -c "npm install -g <your-package-list -here>"

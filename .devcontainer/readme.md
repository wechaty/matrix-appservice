# How to develop in docker containers with vscode.

1. install docker and docker-compose
2. run `bash .devcontainer/init.sh`
3. install vscode extention `ms-vscode-remote.remote-containers`
4. use the extention to open this fold in container
5. develop as in local. 
6. run `npm install && npm run dev:service` to test with synapse.
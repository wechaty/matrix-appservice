import {
  Cli,
}         from 'matrix-appservice-bridge'

import {
  APPSERVER_DEFAULT_PORT,
  REGISTRATION_FILE,
}                               from '../config'

import {
  generateRegistration,
}                           from './generate-registration'

import {
  run,
}                           from './run'

let instance: Cli

export function getCli (): Cli {
  if (!instance) {
    instance = createCli()
  }
  return instance
}

function createCli (): Cli {

  const port             = APPSERVER_DEFAULT_PORT
  const registrationPath = REGISTRATION_FILE
  const bridgeConfig = {
    schema: 'schema/wechaty-config-schema.yaml',
  }

  const cli = new Cli({
    bridgeConfig,
    generateRegistration,
    port,
    registrationPath,
    run,
  })

  return cli
}

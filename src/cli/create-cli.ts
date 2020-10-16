import {
  Cli,
}         from 'matrix-appservice-bridge'

import {
  DEFAULT_PORT,
  REGISTRATION_FILE,
  SCHEMA_FILE,
}                           from '../config'
import {
  generateRegistration,
}                           from './generate-registration'
import {
  run,
}                           from './run'

export function createCli (): Cli<any> {

  const port             = DEFAULT_PORT
  const registrationPath = REGISTRATION_FILE
  const schema           = SCHEMA_FILE

  const bridgeConfig = {
    schema,
  }

  const cli = new Cli({
    bridgeConfig: bridgeConfig as any, // FIXME: Huan(202010) any
    generateRegistration,
    port,
    registrationPath,
    run: run as any,  // FIXME: Huan(202010) any
  })

  return cli
}

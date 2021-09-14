import {
  Cli,
}         from 'matrix-appservice-bridge'

import {
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

  const registrationPath = REGISTRATION_FILE
  const schema           = SCHEMA_FILE

  const bridgeConfig = {
    schema,
  }

  const cli = new Cli({
    bridgeConfig: bridgeConfig as any, // FIXME: Huan(202010) any
    generateRegistration,
    registrationPath,
    run,
  })

  return cli
}

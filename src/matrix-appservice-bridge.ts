import {
  Cli,
}         from 'matrix-appservice-bridge'

import {
  generateRegistration,
  run,
}                           from './appservice/'

import {
  MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
}                                               from './config'

const cli = new Cli({
  registrationPath: MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
  generateRegistration,
  run,
})

cli.run()

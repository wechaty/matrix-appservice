import {
  Cli,
}         from 'matrix-appservice-bridge'

import {
  generateRegistration,
  MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
  run,
}                                               from '../src/'

const cli = new Cli({
  generateRegistration,
  registrationPath: MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
  run,
})

cli.run()

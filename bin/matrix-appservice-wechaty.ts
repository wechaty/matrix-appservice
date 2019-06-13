#!/usr/bin/env node

import {
  checkUpdate,
  getCli,
  log,
  VERSION,
}             from '../src/'

async function main () {
  log.info('MatrixAppserviceWechaty', `v${VERSION}`)

  checkUpdate()

  process.on('warning', (warning) => {
    console.warn(warning.name)    // Print the warning name
    console.warn(warning.message) // Print the warning message
    console.warn(warning.stack)   // Print the stack trace
  })

  const cli = getCli()
  cli.run()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

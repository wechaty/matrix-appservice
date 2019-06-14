#!/usr/bin/env node

import {
  checkUpdate,
  createCli,
  log,
  VERSION,
}                     from '../src/'

async function main () {
  log.info('matrix-appservice-wechaty', `v${VERSION}`)

  checkUpdate()

  process.on('warning', (warning) => {
    log.warn('matrix-appservice-wechaty', 'process.on(warning)')
    console.warn(warning.name)    // Print the warning name
    console.warn(warning.message) // Print the warning message
    console.warn(warning.stack)   // Print the stack trace
  })

  const cli = await createCli()
  cli.run()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

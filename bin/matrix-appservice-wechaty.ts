#!/usr/bin/env node

import readPkgUp from 'read-pkg-up'
import { UpdateNotifier }   from 'update-notifier'

import {
  getCli,
  log,
  VERSION,
}             from '../src/'

async function checkUpdate () {
  const pkg = readPkgUp.sync({ cwd: __dirname })!.package
  const notifier  = new UpdateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
  })
  notifier.notify()
}

process.on('warning', (warning) => {
  console.warn(warning.name)    // Print the warning name
  console.warn(warning.message) // Print the warning message
  console.warn(warning.stack)   // Print the stack trace
})

function main () {
  log.verbose('MatrixAppserviceWechaty', `v${VERSION}`)

  checkUpdate().catch(console.error)

  const cli = getCli()
  cli.run()
}

main()

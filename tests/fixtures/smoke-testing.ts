#!/usr/bin/env ts-node

import { promisify }  from 'util'
import { exec }       from 'child_process'

import {
  VERSION,
}                 from 'matrix-appservice-wechaty'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version not set right before publish!')
  }

  const output = await promisify(exec)('./node_modules/.bin/matrix-appservice-wechaty --help')
  if (/matrix-appservice-wechaty/i.test(output.stdout)) {
    console.info('matrix-appservice-wechaty', 'CLI OK')
  } else {
    throw new Error('cli failed!')
  }

  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

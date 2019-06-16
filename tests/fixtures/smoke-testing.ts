#!/usr/bin/env ts-node

import {
  VERSION,
}                 from 'matrix-appservice-wechaty'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version not set right before publish!')
  }

  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

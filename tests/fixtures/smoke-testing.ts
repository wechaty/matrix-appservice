#!/usr/bin/env ts-node

// tslint:disable:arrow-parens
// tslint:disable:max-line-length
// tslint:disable:member-ordering
// tslint:disable:no-shadowed-variable
// tslint:disable:unified-signatures
// tslint:disable:no-console

import {
  PuppetMock,
  VERSION,
}                 from 'matrix-appservice-wechaty'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version not set right before publish!')
  }

  const puppet = new PuppetMock()
  console.log(`Puppet v${puppet.version()} smoke testing passed.`)
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})

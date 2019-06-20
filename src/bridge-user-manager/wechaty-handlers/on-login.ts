import {
  Contact,
}             from 'wechaty'

import {
  log,
}             from '../../config'

import {
  BridgeUser,
}             from '..'

export async function onLogin (
  this: BridgeUser,
  user: Contact
): Promise<void> {
  log.verbose('wechaty-manager', 'on-login')
  console.info(`${user} login`)

  await this.bridge.getIntent(null).sendText(
    this.matrixDirectMessageRoomID,
    `${user} login`,
  )
}

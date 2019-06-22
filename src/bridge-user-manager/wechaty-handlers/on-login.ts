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
  log.verbose('bridge-user-manager', 'wechaty-handlers/on-login %s login', user)

  await this.matrixBotIntent.sendText(
    this.matrixDirectMessageRoomID,
    `${user} login`,
  )
}

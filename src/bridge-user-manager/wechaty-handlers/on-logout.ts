import {
  Contact,
}             from 'wechaty'

import {
  log,
}             from '../../config'

import {
  BridgeUser,
}             from '..'

export async function onLogout (
  this: BridgeUser,
  user: Contact,
) {
  log.verbose('bridge-user-manager', 'wechaty-handlers/on-logout %s logout', user)

  await this.matrixBotIntent.sendText(
    this.matrixDirectMessageRoomID,
    `${user} logout`,
  )

}

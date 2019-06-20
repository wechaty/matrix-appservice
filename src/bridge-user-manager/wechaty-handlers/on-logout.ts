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
  log.verbose('wechaty-manager', 'on-logout')
  console.info(`${user} logout`)

  await this.bridge.getIntent(null).sendText(
    this.matrixUserId,
    `${user} logout`,
  )

}

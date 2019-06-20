import {
  Message,
}             from 'wechaty'

import {
  log,
}             from '../../config'

import {
  BridgeUser,
}             from '..'

export async function onMessage (
  this: BridgeUser,
  msg: Message
): Promise<void> {
  log.verbose('wechaty-manager', 'on-message')
  console.info(msg.toString())

  await this.bridge.getIntent(null).sendText(
    this.matrixDirectMessageRoomID,
    msg.toString()
  )
}

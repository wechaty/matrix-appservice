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
  log.verbose('bridge-user-manager', 'wechaty-handlers/on-message %s', msg.toString())

  await this.matrixBotIntent.sendText(
    this.matrixDirectMessageRoomID,
    msg.toString()
  )
}

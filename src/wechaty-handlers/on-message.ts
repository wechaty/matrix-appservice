import {
  Message,
  Wechaty,
}             from 'wechaty'

import {
  log,
}             from '../config'

import { AppserviceManager } from '../appservice-manager'

export async function onMessage (
  this: Wechaty,
  msg: Message,
  matrixUserId: string,
  appserviceManager: AppserviceManager,
) {
  log.verbose('wechaty-handlers', 'on-message onMessage(%s, %s)', msg, matrixUserId)

  if (msg.self()) {
    return
  }

  const matrixRoomId = await appserviceManager.directMessageRoomId(matrixUserId)

  await appserviceManager.botIntent.sendText(
    matrixRoomId,
    `recv message: ${msg}`,
  )
}

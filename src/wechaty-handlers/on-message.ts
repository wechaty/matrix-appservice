import {
  Message,
  Wechaty,
}             from 'wechaty'

import {
  log,
}             from '../config'


import { AppserviceManager } from '../appservice-manager';

export async function onMessage (
  this: Wechaty,
  msg: Message,
  matrixUserId: string,
  appserviceManager: AppserviceManager,
) {
  log.verbose('wechaty-handlers', 'on-message onMessage(%s, %s)', msg, matrixUserId)

  const intent = appserviceManager.bridge().getIntent()

  const matrixRoomId = await appserviceManager.directMessageRoomId(matrixUserId)

  await intent.sendText(
    matrixRoomId,
    `recv message: ${msg}`,
  )
}

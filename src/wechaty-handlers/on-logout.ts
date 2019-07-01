import {
  Contact,
  Wechaty,
}             from 'wechaty'

import {
  log,
}             from '../config'
import { AppserviceManager } from '../appservice-manager'

export async function onLogout (
  this: Wechaty,
  user: Contact,
  matrixUserId: string,
  appserviceManager: AppserviceManager,
) {
  log.verbose('wechaty-handlers', 'on-logout onLogout(%s, %s)', user, matrixUserId)

  const matrixRoomId = await appserviceManager.directMessageRoomId(matrixUserId)

  await appserviceManager.botIntent.sendText(
    matrixRoomId,
    `${user} logout`,
  )

}

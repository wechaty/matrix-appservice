import { Event } from 'matrix-appservice-bridge'

import {
  log,
  WECHATY_LOCALPART,
}                     from '../config'

import { AppServiceManager } from './appservice-manager'
import {
  createDirectRoom,
  // createRoom,
}                             from './create-room'

export async function onEventRoomMessage (
  manager: AppServiceManager,
  event: Event,
): Promise<void> {
  log.verbose('AppServiceManager', 'onEventRoomMessage()')

  if (!event.content) {
    log.verbose('AppServiceManager', 'onRoomMessage() no event.content?')
    log.error('AppServiceManager', 'onRoomMessage() %s', JSON.stringify(event))
    return
  }

  const contentBody = event.content.body
  const roomId      = event.room_id
  const senderId    = event.sender
  const userId      = event.user_id

  if (isDirectRoom(roomId)) {
    await onDirectMessage(manager, {
      matrixUserId : senderId,
      matrixRoomId : roomId,
      toGhostId    : userId,
      text         : contentBody,
    })
  } else {
    await onGroupMessage(manager, {
      matrixRoomId : roomId,
      matrixUserId : senderId,
      toGhostId    : userId,
      text         : contentBody,
    })
  }

  // const bridge = getBridge()
}

function isDirectRoom (
  roomId: string,
): boolean {
  // TODO
  return !!roomId.match(/a/)
}

async function onDirectMessage (
  manager: AppServiceManager,
  args: {
    matrixUserId : string,
    matrixRoomId : string,
    toGhostId    : string,
    text         : string,
  },
): Promise<void> {

  const wechatyEnabled = await isEnabledWechaty(manager, args.matrixUserId)

  if (isWechatyBotId(manager, args.toGhostId)) {
    if (wechatyEnabled) {
      await gotoSetupDialog(args.matrixUserId)
    } else {
      await gotoEnableWechatyDialog(args.matrixUserId, args.text)
    }
    return
  }

  if (!wechatyEnabled) {
    const intent = manager.bridge!.getIntent(args.toGhostId)
    await intent.sendText(args.matrixRoomId, 'You are not enable `matrix-appservice-wechaty` yet. Please talk to the `wechaty` bot to check you in.')
    return
  }

  // message to wechaty ghost users
  if (!isWechatyLoggedIn(manager, args.matrixUserId)) {
    await gotoLoginWechatyDialog(args.matrixUserId)
  }

  await bridgeToWechatIndividual(args.matrixUserId, args.toGhostId, args.text)

}

function gotoEnableWechatyDialog (
  matrixUserId: string,
  text: string,
): void {
  log.verbose('AppServiceManager', 'gotoEnableDialog(%s, %s)', matrixUserId, text)
}

function gotoSetupDialog (matrixUserId: string): void {
  log.verbose('AppServiceManager', 'gotoSetupDialog(%s)', matrixUserId)

}

function gotoLoginWechatyDialog (matrixUserId: string): void {
  log.verbose('AppServiceManager', 'gotoLoginWechatDialog(%s)', matrixUserId)

}

async function bridgeToWechatIndividual (
  matrixUserId: string,
  toGhostId: string,
  text: string,
): Promise<void> {
  log.verbose('AppServiceManager', 'bridgeToWechatIndividual(%s, %s, %s)', matrixUserId, toGhostId, text)

}
function isWechatyLoggedIn (
  manager: AppServiceManager,
  matrixUserId: string
): boolean {
  const wechaty = manager.wechatyManager!.get(matrixUserId)

  if (!wechaty) {
    return false
  }

  if (!wechaty.logonoff()) {
    return false
  }

  return true
}

async function isEnabledWechaty (
  manager: AppServiceManager,
  matrixUserId: string,
): Promise<boolean> {
  const userStore = manager.bridge!.getUserStore()
  if (!userStore) {
    throw new Error('no user store')
  }

  const matrixUser = await userStore.getMatrixUser(matrixUserId)

  if (!matrixUser) {
    return false
  }

  const USER_STORE_KEY_ENABLE_WECHATY = 'wechaty'
  const wechatyEnabled = matrixUser.get(USER_STORE_KEY_ENABLE_WECHATY)

  if (!wechatyEnabled) {
    return false
  }

  return true
}

// function localPart (matrixUserId: string): string {
//   const match = matrixUserId.match(/:(.+)$/)
//   if (!match) {
//     throw new Error('no local part match for matrix user id: ' + matrixUserId)
//   }
//   return match[1]
// }

function isWechatyBotId (
  manager: AppServiceManager,
  matrixUserId: string,
): boolean {
  const domain = manager.bridge!.getClientFactory().getClientAs(null).getDomain()

  const REGEX_TEXT  = `^@?${WECHATY_LOCALPART}(:${domain})?$`
  const MATCH_REGEX = new RegExp(REGEX_TEXT, 'i')

  if (MATCH_REGEX.test(matrixUserId)) {
    return true
  }

  return false
}

async function onGroupMessage (
  manager: AppServiceManager,
  args: {
    matrixRoomId : string,
    matrixUserId : string,
    toGhostId    : string,
    text         : string,
  },
): Promise<void> {

  const hasLinkedRoom = await hasLinkedWechatyRoom(manager, args.matrixRoomId)
  if (hasLinkedRoom) {
    await bridgeToWechatyRoom(args.matrixRoomId, args.text)
  }

  log.silly('AppServiceManager', 'onGroupMessage(%s) did not match any wechat room', args.matrixRoomId)

  await test(manager, args.matrixUserId, args.matrixRoomId, args.text)
}

async function hasLinkedWechatyRoom (
  manager: AppServiceManager,
  matrixRoomId: string,
): Promise<boolean> {
  const roomStore = manager.bridge!.getRoomStore()

  if (!roomStore) {
    log.verbose('AppServiceManager', 'hasLinkedWechatyRoom() no room store')
    return false
  }

  const matrixRoom = await roomStore.getMatrixRoom(matrixRoomId)
  if (!matrixRoom) {
    return false
  }

  const WECHAT_ROOM_ID_KEY = 'wechaty_room_id'
  const wechatRoomId = matrixRoom.get(WECHAT_ROOM_ID_KEY)

  if (!wechatRoomId) {
    return false
  }

  return true
}

async function bridgeToWechatyRoom (
  matrixRoomId: string,
  text: string,
): Promise<void> {
  log.verbose('AppServiceManager', 'bridgeToWechatyRoom(%s, %s)', matrixRoomId, text)
}

async function test (
  manager: AppServiceManager,
  userId: string,
  roomId: string,
  text: string,
) {
  // FIXME:
  const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'
  if (roomId === ROOM_ID) {
    const intent = manager.bridge!.getIntent('@wechaty_' + userId.replace(/^@/, ''))
    intent.sendText(ROOM_ID, `I repeat: ${userId} said ${text}`)

    console.info('XIXI username', userId, text)

    const createdRoomId = await createDirectRoom(
      intent,
      userId,
      'name: haha',
      'topic: long longgggggggg',
    )

    console.info('createdRoomId', createdRoomId)

    await intent.sendText(createdRoomId, `I repeat: you said ${text}`)
  }

}

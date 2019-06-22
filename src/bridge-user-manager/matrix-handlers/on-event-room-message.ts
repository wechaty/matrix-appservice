import {
  Event,
}           from 'matrix-appservice-bridge'

import {
  log,
  WECHATY_LOCALPART,
}                       from '../../config'
// import {
//   AppServiceManager,
// }                       from '../../appservice-manager/'
import {
  createDirectRoom,
  // createRoom,
}                       from '../../appservice-manager/create-room'

import {
  BridgeUser,
}                 from '../bridge-user'

export async function onEventRoomMessage (
  this  : BridgeUser,
  event : Event,
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message onEventRoomMessage()')

  if (!event.content) {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message onRoomMessage() no event.content?')
    log.error('bridge-user-manager', 'matrix-handlers/on-event-room-message onRoomMessage() %s', JSON.stringify(event))
    return
  }

  const contentBody = event.content.body
  const roomId      = event.room_id
  const senderId    = event.sender
  const userId      = event.user_id

  const filehelper = await this.wechaty.Contact.find('filehelper')
  if (filehelper) {
    await filehelper.say(`Matrix user ${senderId} in room ${roomId} to id ${userId} said: ${contentBody}`)
  } else {
    log.error('bridge-user-manager', 'matrix-handlers/on-event-room-message matrix-handlers on-event-room-message filehelper not found from wechaty')
  }

  if (isDirectRoom.call(this, roomId)) {
    await onDirectMessage.call(this, {
      matrixUserId : senderId,
      matrixRoomId : roomId,
      toGhostId    : userId,
      text         : contentBody,
    })
  } else {
    await onGroupMessage.call(this, {
      matrixRoomId : roomId,
      matrixUserId : senderId,
      toGhostId    : userId,
      text         : contentBody,
    })
  }

  // const bridge = getBridge()
}

function isDirectRoom (
  this: BridgeUser,
  matrixRoomId: string,
): boolean {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message isDriectRoom(%s)', matrixRoomId)

  const matrixRoom = this.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
  matrixRoom!.get('is_direct')

  const client = this.bridge.getClientFactory().getClientAs(this.matrixUserId)
  const matrixClientRoom = client.getRoom(matrixRoomId)
  if (!matrixClientRoom) {
    return false
  }
  matrixClientRoom

  // TODO
  return !!matrixRoomId.match(/a/)
}

async function onDirectMessage (
  this: BridgeUser,
  args: {
    matrixUserId : string,
    matrixRoomId : string,
    toGhostId    : string,
    text         : string,
  },
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message onDirectMessage()')

  const wechatyEnabled = await isEnabledWechaty.call(this, args.matrixUserId)

  if (isWechatyBotId.call(this, args.toGhostId)) {
    if (wechatyEnabled) {
      await gotoSetupDialog(args.matrixUserId)
    } else {
      await gotoEnableWechatyDialog(args.matrixUserId, args.text)
    }
    return
  }

  if (!wechatyEnabled) {
    const intent = this.bridge.getIntent(args.toGhostId)
    await intent.sendText(args.matrixRoomId, 'You are not enable `matrix-appservice-wechaty` yet. Please talk to the `wechaty` bot to check you in.')
    return
  }

  // message to wechaty ghost users
  if (!this.wechaty.logonoff()) {
    await gotoLoginWechatyDialog(args.matrixUserId)
  }

  await bridgeToWechatIndividual(args.matrixUserId, args.toGhostId, args.text)

}

function gotoEnableWechatyDialog (
  matrixUserId: string,
  text: string,
): void {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoEnableDialog(%s, %s)', matrixUserId, text)
}

function gotoSetupDialog (matrixUserId: string): void {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoSetupDialog(%s)', matrixUserId)

}

function gotoLoginWechatyDialog (matrixUserId: string): void {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoLoginWechatDialog(%s)', matrixUserId)

}

async function bridgeToWechatIndividual (
  matrixUserId: string,
  toGhostId: string,
  text: string,
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message bridgeToWechatIndividual(%s, %s, %s)', matrixUserId, toGhostId, text)
}

async function isEnabledWechaty (
  this: BridgeUser,
  matrixUserId: string,
): Promise<boolean> {
  const userStore = this.bridge.getUserStore()
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
  this: BridgeUser,
  matrixUserId: string,
): boolean {
  const domain = this.bridge.getClientFactory().getClientAs(null).getDomain()

  const REGEX_TEXT  = `^@?${WECHATY_LOCALPART}(:${domain})?$`
  const MATCH_REGEX = new RegExp(REGEX_TEXT, 'i')

  if (MATCH_REGEX.test(matrixUserId)) {
    return true
  }

  return false
}

async function onGroupMessage (
  this: BridgeUser,
  args: {
    matrixRoomId : string,
    matrixUserId : string,
    toGhostId    : string,
    text         : string,
  },
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message onGroupMessage()')

  const hasLinkedRoom = await hasLinkedWechatyRoom.call(this, args.matrixRoomId)
  if (hasLinkedRoom) {
    await bridgeToWechatyRoom(args.matrixRoomId, args.text)
  }

  log.silly('bridge-user-manager', 'matrix-handlers/on-event-room-message onGroupMessage(%s) did not match any wechat room', args.matrixRoomId)

  await test.call(this, args.matrixUserId, args.matrixRoomId, args.text)
}

async function hasLinkedWechatyRoom (
  this: BridgeUser,
  matrixRoomId: string,
): Promise<boolean> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom(%s)', matrixRoomId)

  const roomStore = this.bridge.getRoomStore()

  if (!roomStore) {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom() no room store')
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
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message bridgeToWechatyRoom(%s, %s)', matrixRoomId, text)
}

async function test (
  this: BridgeUser,
  userId: string,
  roomId: string,
  text: string,
) {
  // FIXME:
  const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'
  if (roomId === ROOM_ID) {
    const intent = this.bridge.getIntent('@wechaty_' + userId.replace(/^@/, ''))
    await intent.sendText(ROOM_ID, `I repeat: ${userId} said ${text}`)

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

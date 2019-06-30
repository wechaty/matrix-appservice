import {
  Event,
  MatrixRoom,
  RemoteRoom,
}               from 'matrix-appservice-bridge'

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
      text         : contentBody || '',
    })
  } else {
    await onGroupMessage.call(this, {
      matrixRoomId : roomId,
      matrixUserId : senderId,
      toGhostId    : userId,
      text         : contentBody || '',
    })
  }

  // const bridge = getBridge()
}

function isDirectRoom (
  this: BridgeUser,
  matrixRoomId: string,
): boolean {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message isDriectRoom(%s)', matrixRoomId)

  // const matrixRoom = this.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
  // matrixRoom!.get('is_direct')

  const client = this.bridge.getClientFactory().getClientAs(this.matrixUserId)
  const matrixClientRoom = client.getRoom(matrixRoomId)
  if (!matrixClientRoom) {
    return false
  }

  const dmInviter = matrixClientRoom.getDMInviter()

  return !!dmInviter
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

  // FIXME: here is always enabled.
  // move the enable wechaty dialog code to upper
  const wechatyEnabled = await isEnabledWechaty.call(this, args.matrixUserId)

  if (this.bridge.getBot().isRemoteUser(args.toGhostId)) {
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
  } else {
    await bridgeToWechatIndividual(args.matrixUserId, args.toGhostId, args.text)
  }

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

async function onGroupMessage (
  this: BridgeUser,
  args: {
    matrixRoomId : string,
    matrixUserId : string,
    text         : string,
    toGhostId    : string,
  },
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message onGroupMessage()')

  const { matrixRoom, remoteRoom } = await getRoomPair.call(this, args.matrixRoomId)

  if (remoteRoom) {

    await bridgeToWechatyRoom.call(this, {
      matrixRoom,
      remoteRoom,
      text: args.text,
      toGhostId: args.toGhostId,
    })

  } else {
    log.silly('bridge-user-manager', 'matrix-handlers/on-event-room-message onGroupMessage(%s) did not match any wechat room', args.matrixRoomId)
  }

  await test.call(this, args.matrixUserId, args.matrixRoomId, args.text)
}

async function getRoomPair (
  this: BridgeUser,
  matrixRoomId: string,
): Promise<{
  matrixRoom: MatrixRoom,
  remoteRoom: RemoteRoom,
}> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom(%s)', matrixRoomId)

  const roomStore = this.bridge.getRoomStore()

  if (!roomStore) {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom() no room store')
    throw new Error('no room store')
  }

  const matrixRoom = await roomStore.getMatrixRoom(matrixRoomId)
  if (!matrixRoom) {
    throw new Error('can not get matrix room from id: ' + matrixRoomId)
  }

  const remoteRoomList = await roomStore.getLinkedRemoteRooms(matrixRoomId)
  if (remoteRoomList.length <= 0) {
    throw new Error('can not get remote room from matrixRoomId: ' + matrixRoomId)
  }
  const remoteRoom = remoteRoomList[0]

  return {
    matrixRoom,
    remoteRoom,
  }
}

async function bridgeToWechatyRoom (
  this: BridgeUser,
  args: {
    matrixRoom : MatrixRoom,
    remoteRoom : RemoteRoom,
    text       : string,
    toGhostId  : string,
}): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message bridgeToWechatyRoom(%s, %s)',
    args.matrixRoom.roomId, args.text)

  const wechatyRoomId = args.remoteRoom.getId()

  try {

    const room = this.wechaty.Room.load(wechatyRoomId)
    await room.say(`${args.toGhostId} -> ${args.text}`)

  } catch (e) {
    const errMsg = `no wechaty room found for id: ${wechatyRoomId}`
    log.warn('bridge-user-manager', 'matrix-handlers on-0event-room-message bridgeToWechatyRoom() %s',
      errMsg)
    await this.matrixBotIntent.sendText(this.matrixDirectMessageRoomID, errMsg)
  }

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
    )

    console.info('createdRoomId', createdRoomId)

    await intent.sendText(createdRoomId, `I repeat: you said ${text}`)
  }

}

// const rooms = await this.bridge.getRoomStore().getEntriesByRemoteRoomData({

import {
  BridgeContext,
  Request,
  Bridge,
}                       from 'matrix-appservice-bridge'

import {
  log,
}             from '../config'

import { AppServiceManager } from './appservice-manager'

/*
{ age: 64,
  content: { is_direct: true, membership: 'invite' },
  event_id: '$156160813719ZSyyB:aka.cn',
  origin_server_ts: 1561608137848,
  room_id: '!BJWCOBYsBwgHqqomGG:aka.cn',
  sender: '@huan:aka.cn',
  state_key: '@wechaty:aka.cn',
  type: 'm.room.member',
  unsigned: { age: 64 },
  user_id: '@huan:aka.cn' }

  { age: 80,
  content:
   { avatar_url: null,
     displayname: 'wechaty_xxx',
     is_direct: true,
     membership: 'invite' },
  event_id: '$156164754730XRMfy:aka.cn',
  origin_server_ts: 1561647547234,
  room_id: '!XDxZYEqhdGdPHVmxmP:aka.cn',
  sender: '@huan:aka.cn',
  state_key: '@wechaty_xxx:aka.cn',
  type: 'm.room.member',
  unsigned: { age: 80 },
  user_id: '@huan:aka.cn' }

  */
export async function onNonBridgeUserEvent (
  this: AppServiceManager,
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.verbose('appservice-manager', 'on-non-bridge-user-event({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const event = request.getData()

  const matrixRoomId = event.room_id
  // const matrixUserId = event.sender
  // const userId = event.user_id

  if (await isDirectRoom(this.bridge!, matrixRoomId)) {
    console.info('is direct')
  } else {
    console.info('not direct')
  }
  console.info(event)
}

async function isDirectRoom (
  bridge: Bridge,
  matrixRoomId: string,
): Promise<boolean> {
  log.verbose('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s)', matrixRoomId)

  const roomStore = bridge.getRoomStore()
  if (!roomStore) {
    throw new Error('no room store')
  }

  const matrixRoom = roomStore.getMatrixRoom(matrixRoomId)
  if (!matrixRoom) {
    throw new Error('no matrix room')
  }

  let isDirect: boolean = matrixRoom.get('isDirect')
  if (typeof isDirect === 'boolean') {
    log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache hit)',
      matrixRoomId, isDirect)
    return isDirect
  }

  const memberMap = await bridge.getBot().getJoinedMembers(matrixRoomId)
  const memberNum = Object.keys(memberMap).length

  if (memberNum === 2) {
    isDirect = true
  } else {
    isDirect = false
  }
  log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache miss)',
    matrixRoomId, isDirect)

  matrixRoom.set('isDirect', isDirect)
  await roomStore.setMatrixRoom(matrixRoom)

  console.info('isDirect', isDirect)

  return isDirect
}

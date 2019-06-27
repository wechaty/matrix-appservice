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

  if (isDirectRoom(this.bridge!, matrixRoomId)) {
    console.info('is direct')
  } else {
    console.info('not direct')
  }
  console.info(event)
}

function isDirectRoom (
  bridge: Bridge,
  matrixRoomId: string,
): boolean {
  log.verbose('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s)', matrixRoomId)

  // const matrixRoom = this.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
  // matrixRoom!.get('is_direct')

  // TODO(huan): continue to work on this part...

  const client = bridge.getClientFactory().getClientAs('@huan:aka.cn')
  console.info('client', client)
  console.info('client.store', (client as any).store)

  const roomList = client.getRooms()
  console.info('roomList', roomList)

  const matrixClientRoom = client.getRoom(matrixRoomId)
  console.info('matrixClientRoom', matrixClientRoom)
  if (!matrixClientRoom) {
    return false
  }

  const dmInviter = matrixClientRoom.getDMInviter()
  console.info('dmInviter', dmInviter)

  return !!dmInviter
}

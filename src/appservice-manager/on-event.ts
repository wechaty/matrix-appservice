import {
  Request,
  BridgeContext,
  Event,
  Bridge,
}                     from 'matrix-appservice-bridge'

import {
  log,
}                   from '../config'
import {
  BridgeUser,
  wechatyEnabled,
}                   from '../bridge-user-manager'

import {
  onEvent as onBridgeUserEvent,
  // onUserQuery as onBridgeUserUserQuery,
}                                       from '../bridge-user-manager/matrix-handlers'

import {
  AppServiceManager,
}                         from './appservice-manager'

import {
  onNonBridgeUserEvent,
}                         from './on-non-bridge-user-event'

export async function onEvent (
  this: AppServiceManager,
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.verbose('appservice-manager', 'on-event onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  // console.info(request, context)

  const event = request.getData()

  if (isFromWechatyGhost(event)) {
    log.verbose('appservice-manager', 'on-event onEvent() isFromWechatyGhost() is true, skipped')
    return
  }

  if (isRoomInvitation(event)) {
    await acceptRoomInvitation(this.bridge!, event)
    return
  }

  if (!await isKnownRoom(this.bridge!, event)) {
    await replyUnknownRoom(this.bridge!, event)
    return
  }

  const matrixUser   = context.senders.matrix
  const matrixUserId = matrixUser.userId

  if (wechatyEnabled(matrixUser)) {
    const wechaty = this.wechatyManager!.load(matrixUserId)
    const bridgeUser = new BridgeUser(matrixUserId, this.bridge!, wechaty)

    onBridgeUserEvent.call(bridgeUser, request, context)
      .catch(e => {
        log.error('AppServiceManager', 'onEvent() onBridgeUserEvent() rejection: %s', e && e.message)
      })

  } else {

    onNonBridgeUserEvent.call(this, request, context)
      .catch(e => {
        log.error('AppServiceManager', 'onEvent() onNonBridgeUserEvent() rejection: %s', e && e.message)
      })

  }

}

function isRoomInvitation (event: Event): boolean {
  log.verbose('appservice-manager', 'on-event isRoomInvitation()')
  return !!(
    event.type === 'm.room.member'
    && event.content && event.content.membership === 'invite'
    && event.state_key
  )
}

async function acceptRoomInvitation (
  bridge: Bridge,
  event: Event,
): Promise<void> {
  log.verbose('appservice-manager', 'on-event acceptRoomInvitation()')

  const inviteeMatrixUserId = event.state_key!
  const matrixRoomId        = event.room_id

  const intent = bridge.getIntent(inviteeMatrixUserId)

  await intent.join(matrixRoomId)
}

async function isKnownRoom (
  bridge: Bridge,
  event: Event,
): Promise<boolean> {
  log.verbose('appservice-manager', 'on-event isKnownRoom()')

  const roomStore = await bridge.getRoomStore()
  if (!roomStore) {
    throw new Error('no room store')
  }
  const matrixRoomId = event.room_id
  const entrieList = roomStore.getEntriesByMatrixId(matrixRoomId)
  if (entrieList.length >= 0) {
    return true
  }
  return false
}

/*
{ age: 43,
  content: { body: 'b', msgtype: 'm.text' },
  event_id: '$156165443741OCgSZ:aka.cn',
  origin_server_ts: 1561654437732,
  room_id: '!iMkbIwAOkbvCQbRoMm:aka.cn',
  sender: '@huan:aka.cn',
  type: 'm.room.message',
  unsigned: { age: 43 },
  user_id: '@huan:aka.cn' }
*/
async function replyUnknownRoom (
  bridge: Bridge,
  event: Event,
): Promise<void> {
  log.verbose('appservice-manager', 'on-event replyUnnownRoom()')

  // const client = bridge.getClientFactory().getClientAs()
  // console.info('peeking')
  // await client.peekInRoom(event.room_id)

  // console.info('peeked')

  // const room = client.getRoom(event.room_id)
  // if (!room) {
  //   throw new Error('no room')
  // }
  // const dmInviter = room.getDMInviter()
  // console.info('dminviter', dmInviter)

  const memberMap = await bridge.getBot().getJoinedMembers(event.room_id)

  const wechatyGhostIdList = Object.keys(memberMap).filter(id => id.match(/^@wechaty/i))
  if (wechatyGhostIdList.length <= 0) {
    throw new Error('no wechaty ghost in the room')
  }

  const ghostId = wechatyGhostIdList[0]
  console.info('ghostId', ghostId)

  // for (const member of memberList) {
  //   console.info('member', member)
  //   console.info('member id', member.userId)
  // }

  const intent = bridge.getIntent(ghostId)
  await intent.sendText(event.room_id, 'replyUnknownRoom: ' + event.content!.body)
}

function isFromWechatyGhost (event: Event) {
  log.verbose('appservice-manager', 'on-event isFromWechatyGhost({user_id:"%s"})', event.user_id)

  return event.user_id.match(/^@wechaty/i)
}

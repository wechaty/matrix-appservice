import { log } from '../config'

import { getBridge } from './get-bridge'

import {
  BridgeContext,
  Bridge,
  Event,
  Request,
}               from 'matrix-appservice-bridge'

export async function onEvent (
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.info('AppService', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const event = request.getData()

  const bridge = getBridge()

  try {
    await doit(bridge, event)
  } catch (e) {
    console.error(e)
  }
}

async function doit (
  bridge: Bridge,
  event: Event,
): Promise<void> {
  // FIXME:
  const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'

  // replace with your room ID
  if (event.type !== 'm.room.message' || !event.content || event.room_id !== ROOM_ID) {
    return
  }

  const username = event.user_id
  const text = event.content.body

  const intent = bridge.getIntent('@wechaty_' + username.replace(/^@/, ''))
  intent.sendText(ROOM_ID, `I repeat: ${username} said ${text}`)

  console.info('XIXI username', username, text)

  const roomInfo = await intent.createRoom({
    createAsClient: true,
    options: {
      preset: 'trusted_private_chat',
      is_direct: true,
      visibility: 'private',
      invite: [
        username,
      ],
      name: '群名称',
      topic: '群主题',
    },
  })

  const createdRoomId = roomInfo.room_id

  console.info('createdRoomId', createdRoomId)

  await intent.sendText(createdRoomId, `I repeat: you said ${text}`)
}

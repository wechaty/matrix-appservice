import {
  BridgeContext,
  Event,
  Request,
}                       from 'matrix-appservice-bridge'

import {
  log,
}             from '../../config'

import { BridgeUser } from '../bridge-user'

import {
  onEventRoomMessage,
}                       from './on-event-room-message'

export async function onEvent (
  this: BridgeUser,
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.verbose('AppServiceManager', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const event = request.getData()

  try {
    await dispatchEvent.call(this, event)
  } catch (e) {
    log.error('AppServiceManager', 'onEvent exception: %s', e && e.message)
  }
}

async function dispatchEvent (
  this: BridgeUser,
  event: Event,
): Promise<void> {
  log.verbose('AppService', 'onEvent() dispatcher()')

  switch (event.type) {

    case 'm.room.message':
      await onEventRoomMessage.call(this, event)
      break

    default:
      log.silly('AppService', 'onEvent() default')
      break

  }
}

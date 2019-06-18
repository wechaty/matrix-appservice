import {
  BridgeContext,
  Event,
  Request,
}                       from 'matrix-appservice-bridge'

import {
  log,
}             from '../config'

import { AppServiceManager } from './appservice-manager'
import {
  onEventRoomMessage,
}                       from './on-event-room-message'

export async function onEvent (
  manager: AppServiceManager,
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.verbose('AppServiceManager', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const event = request.getData()

  try {
    await dispatchEvent(manager, event)
  } catch (e) {
    log.error('AppServiceManager', 'onEvent exception: %s', e && e.message)
  }
}

async function dispatchEvent (
  manager: AppServiceManager,
  event: Event,
): Promise<void> {
  log.verbose('AppService', 'onEvent() dispatcher()')

  switch (event.type) {

    case 'm.room.message':
      await onEventRoomMessage(manager, event)
      break

    default:
      log.silly('AppService', 'onEvent() default')
      break

  }
}

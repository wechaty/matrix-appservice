import {
  BridgeContext,
  Event,
  Request,
}                   from 'matrix-appservice-bridge'

import {
  log,
}         from '../../config'

import {
  BridgeUser,
}               from '../bridge-user'

import {
  onEventRoomMessage,
}                       from './on-event-room-message'

export async function onEvent (
  this    : BridgeUser,
  request : Request,
  context : BridgeContext,
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event onEvent() ({type: "%s"}, {userId: "%s"})',
    request.data.type,
    context.senders.matrix.userId,
  )

  const event = request.getData()

  try {
    await dispatchEvent.call(this, event)
  } catch (e) {
    log.error('bridge-user-manager', 'matrix-handlers/on-event onEvent() exception: %s', e && e.message)
  }
}

async function dispatchEvent (
  this  : BridgeUser,
  event : Event,
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event dispatchEvent() dispatcher()')

  switch (event.type) {

    case 'm.room.message':
      await onEventRoomMessage.call(this, event)
      break

    default:
      log.silly('bridge-user-manager', 'matrix-handlers/on-event dispatchEvent() default')
      break

  }
}

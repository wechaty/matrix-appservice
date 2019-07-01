import {
  BridgeContext,
  Event,
  Request,
}                   from 'matrix-appservice-bridge'

import {
  log,
}         from '../config'

import {
  AppserviceUser,
}               from '../appservice-user'

import { AppserviceManager } from '../appservice-manager'
import { WechatyManager } from '../wechaty-manager'

import {
  onEventRoomMessage,
}                       from './on-event-room-message'

export async function onEvent (
  request : Request,
  context : BridgeContext,
  appserviceManager: AppserviceManager,
  wechatymanager    : WechatyManager,
): Promise<void> {
  log.verbose('bridge-user-manager', 'matrix-handlers/on-event onEvent() ({type: "%s"}, {userId: "%s"})',
    request.data.type,
    context.senders.matrix.userId,
  )

  const event = request.getData()

  try {
    await dispatchEvent(event)
  } catch (e) {
    log.error('bridge-user-manager', 'matrix-handlers/on-event onEvent() exception: %s', e && e.message)
  }
}

async function dispatchEvent (
  this  : WechatyManager,
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


function presudoMatrixMessage () {

  if (sendFromRemoteUser()) {
    return
  }

  if (linkedRoom()) {
    forwardMessage()
    return
  }

  if (isDirect()) {
    if (enabledWechaty()) {
      setupDialog()
    } else {
      enableDialog()
    }
    return
  }

  // Group, not direct
  log.warn()
  return

}


function presudoWechatMessage () {
  if (self()) {
    return
  }

    forwardWechatMessage()
    return

}

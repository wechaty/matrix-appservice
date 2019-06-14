import {
  Event,
}             from 'matrix-appservice-bridge'

import {
  log,
}             from '../config'

import { AppServiceManager } from './appservice-manager'
import {
  onEventRoomMessage,
}                       from './on-event-room-message'

export async function dispatchEvent (
  manager: AppServiceManager,
  event: Event,
): Promise<void> {
  log.verbose('AppService', 'onEvent() dispatcher()')

  switch (event.type) {

    case 'm.room.message':
      onEventRoomMessage(manager, event)
      break

    default:
      log.silly('AppService', 'onEvent() default')
      break

  }
}

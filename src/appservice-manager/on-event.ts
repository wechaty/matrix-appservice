import {
  Request,
  BridgeContext,
}                     from 'matrix-appservice-bridge'

import {
  log,
}                   from '../config'
import {
  BridgeUser,
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
) {
  log.verbose('AppServiceManager', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const matrixUserId = context.senders.matrix.userId

  if (isBridgeUser(matrixUserId)) {
    const wechaty = this.wechatyManager!.get(matrixUserId)
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

function isBridgeUser (matrixUserId: string): boolean {
  // TODO:
  return !!matrixUserId
}

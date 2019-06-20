import {
  Request,
  BridgeContext,
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
) {
  log.verbose('AppServiceManager', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

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

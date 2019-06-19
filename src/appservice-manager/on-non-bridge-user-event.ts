import {
  BridgeContext,
  Request,
}                       from 'matrix-appservice-bridge'

import {
  log,
}             from '../config'

import { AppServiceManager } from './appservice-manager'

export async function onNonBridgeUserEvent (
  this: AppServiceManager,
  request: Request,
  context: BridgeContext,
): Promise<void> {
  log.verbose('appservice-manager', 'on-event({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

  const event = request.getData()
  console.info(event)
}

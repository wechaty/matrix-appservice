import {
  Request,
  BridgeContext,
  Bridge,
}                   from 'matrix-appservice-bridge'

import {
  log,
  REGISTRATION_FILE,
}                         from '../config'
import {
  AppServiceManager,
}                         from '.'

let appServiceManager: AppServiceManager

export function createBridge (manager: AppServiceManager) {
  log.verbose('AppServiceManager', 'createBridge()')

  appServiceManager = manager

  const domain        = 'aka.cn'
  const homeserverUrl = 'http://matrix.aka.cn:8008'
  const registration  = REGISTRATION_FILE

  const controller = {
    onEvent     : onEvent,
    onUserQuery : onUserQuery,
  }

  const bridge = new Bridge({
    controller,
    domain,
    homeserverUrl,
    registration,
  })

  return bridge
}

function onEvent (
  request: Request,
  context: BridgeContext,
): void {
  log.verbose('create-bridge', 'onEvent()')
  appServiceManager.onEvent(request, context)
}

async function onUserQuery (queriedUser: any): Promise<object> {
  log.verbose('create-bridge', 'onUserQuery()')
  return appServiceManager.onUserQuery(queriedUser)
}

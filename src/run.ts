import {
  log,
  BridgeConfig,
}                         from './config'

import { AppServiceManager } from './appservice-manager/'
import { WechatyManager } from './wechaty-manager/'
import { BridgeUserManager } from './bridge-user-manager'

export async function run (
  port   : number,
  config : BridgeConfig,
): Promise<void> {
  log.info('matrix-appservice-wechaty', 'run(port=%s,)', port)

  const appServiceManager = new AppServiceManager()
  const wechatyManager    = new WechatyManager(appServiceManager)

  await Promise.all([
    appServiceManager.start(port, config),
    wechatyManager.start(),
  ])

  const bridgeUserManager = new BridgeUserManager(appServiceManager)

  const bridgeUserList = await bridgeUserManager.getBridgeUserList()

  // loop start wechaty pool
  for (const bridgeUser of bridgeUserList) {
    await bridgeUser.wechaty.start()
      .then(() => log.verbose('run', 'bridgeUser.wechaty.start() %s started', bridgeUser.matrixUserId))
      .catch(e => log.error('run', 'bridgeUser.wechaty.start() %s rejection: %s', bridgeUser.matrixUserId, e && e.message))
  }

  // await bootstrap()
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

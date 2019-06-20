import { log } from './config'

import { AppServiceManager } from './appservice-manager/'
import { WechatyManager } from './wechaty-manager/'
import { BridgeUserManager } from './bridge-user-manager'

export async function run (
  port   : number,
  config : object,
): Promise<void> {
  log.info('matrix-appservice-wechaty', 'run(port=%s,)', port)

  const appServiceManager = new AppServiceManager()
  const wechatyManager    = new WechatyManager(appServiceManager)

  await Promise.all([
    appServiceManager.start(port, config),
    wechatyManager.start(),
  ])

  const bridgeUserManager = new BridgeUserManager(appServiceManager)

  const optionList = bridgeUserManager.getBridgeUserList()
  for (const [matrixUserId, wechatyOption] of optionList) {
    await wechatyManager.add(matrixUserId, wechatyOption)
  }

  // loop start wechaty pool
  for (const [name, wechaty] of wechatyManager.wechatyStore) {
    await wechaty.start()
      .then(() => log.verbose('WechatyManager', 'start() %s started', name))
      .catch(e => log.error('WechatyManager', 'start() %s rejection', name, e && e.message))
  }

  // await bootstrap()
}

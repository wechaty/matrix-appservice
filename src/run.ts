import { log } from './config'

import { AppServiceManager } from './appservice-manager/'
import { WechatyManager } from './wechaty-manager/'

export async function run (
  port   : number,
  config : object,
): Promise<void> {
  log.info('matrix-appservice-wechaty', 'run(port=%s,)', port)

  const appServiceManager = new AppServiceManager()
  const wechatyManager    = new WechatyManager()

  connect(appServiceManager, wechatyManager)

  await Promise.all([
    appServiceManager.start(port, config),
    wechatyManager.start(),
  ])

  await appServiceManager.bootstrap()
}

function connect (
  appServiceManager: AppServiceManager,
  wechatyManager: WechatyManager,
): void {
  wechatyManager.connect(appServiceManager)
  appServiceManager.connect(wechatyManager)
}

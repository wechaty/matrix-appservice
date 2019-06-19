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

  const optionList = appServiceManager.getWechatyOptionsList()
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

function connect (
  appServiceManager: AppServiceManager,
  wechatyManager: WechatyManager,
): void {
  wechatyManager.connect(appServiceManager)
  appServiceManager.connect(wechatyManager)
}

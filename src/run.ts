import { log } from './config'

import { AppServiceManager } from './appservice-manager/'
import { WechatyManager } from './wechaty-manager/'

export async function run (
  port   : number,
  config : object,
): Promise<void> {
  log.info('matrix-appservice-wechaty', 'run() listening on port %s', port)
  log.verbose('MatrixAppServiceWechaty', 'run(,config="%s")', JSON.stringify(config))

  const wechatyManager = new WechatyManager()
  const appServiceManager = new AppServiceManager()

  wechatyManager.connect(appServiceManager)
  appServiceManager.connect(wechatyManager)

  await Promise.all([
    appServiceManager.start(port, config),
    wechatyManager.start(),
  ])

  await appServiceManager.bootstrap()
}

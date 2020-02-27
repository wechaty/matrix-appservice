import {
  Bridge,
  Request,
  BridgeContext,
}                   from 'matrix-appservice-bridge'

import { AppserviceManager }  from '../appservice-manager'
import { log }                from '../config'
import { MatrixHandler }      from '../matrix-handler'
import { WechatyManager }     from '../wechaty-manager'

import { BridgeConfig }     from './bridge-config-schema'
import { DialogManager }    from '../dialog-manager'

export async function run (
  port         : number,
  bridgeConfig : BridgeConfig,
): Promise<void> {
  log.info('cli', 'run(port=%s,)', port)

  const appserviceManager = new AppserviceManager()
  const wechatyManager    = new WechatyManager(appserviceManager)

  const dialogManager = new DialogManager(
    appserviceManager,
    wechatyManager,
  )

  const matrixHandler = new MatrixHandler(dialogManager)

  const matrixBridge = createBridge(
    bridgeConfig,
    matrixHandler,
  )

  await matrixBridge.run(port, bridgeConfig)

  appserviceManager.setBridge(matrixBridge)
  matrixHandler.setManager(
    appserviceManager,
    wechatyManager,
  )

  const bridgeMatrixUserList = await appserviceManager.enabledUserList()

  const wechatyStartFutureList = bridgeMatrixUserList.map(
    matrixUser => {
      const wechatyOptions = appserviceManager.wechatyOptions(matrixUser)
      const wechaty = wechatyManager.create(
        matrixUser.getId(),
        wechatyOptions,
      )
      return wechaty.start()
    }
  )

  // wait all wechaty to be started
  await Promise.all(wechatyStartFutureList)
}

function createBridge (
  bridgeConfig  : BridgeConfig,
  matrixHandler : MatrixHandler,
): Bridge {
  log.verbose('AppServiceManager', 'createBridge("%s")', JSON.stringify(bridgeConfig))

  const {
    domain,
    homeserverUrl,
    registration,
  }                 = bridgeConfig

  // const domain        = 'aka.cn'
  // const homeServerUrl = 'http://matrix.aka.cn:8008'
  // const registrationFile  = REGISTRATION_FILE

  const onEvent = (
    request: Request,
    context: BridgeContext
  ) => matrixHandler.onEvent(
    request,
    context,
  )

  /**
   * This is for keeping a clear typing information
   */
  const onUserQuery = (
    user: any
  ) => matrixHandler.onUserQuery(
    user,
  )

  const controller = {
    onEvent,
    onUserQuery,
  }

  const bridge = new Bridge({
    controller,
    domain,
    homeserverUrl,
    registration,
  })

  return bridge
}

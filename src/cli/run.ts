import {
  Bridge,
  Request,
  BridgeContext,
}                   from 'matrix-appservice-bridge'

import {
  MatrixHandler,
}                                     from '../matrix-handler/'

import {
  log,
}               from '../config'

import { AppserviceManager }  from '../appservice-manager'
import { WechatyManager }     from '../wechaty-manager'

import {
  BridgeConfig,
}                         from './bridge-config-schema'

export async function run (
  port         : number,
  bridgeConfig : BridgeConfig,
): Promise<void> {
  log.info('cli', 'run(port=%s,)', port)

  const appserviceManager = new AppserviceManager()
  const wechatyManager    = new WechatyManager(appserviceManager)

  const matrixBridge = createBridge(
    bridgeConfig,
    appserviceManager,
    wechatyManager,
  )

  appserviceManager.setBridge(matrixBridge)

  await matrixBridge.run(port, bridgeConfig)

  const bridgeMatrixUserList = await appserviceManager.matrixUserList()

  const wechatyStartFutureList = bridgeMatrixUserList.map(
    matrixUser => {
      const wechatyOptions = appserviceManager.wechatyOptions(matrixUser)
      const wechaty = wechatyManager.wechaty(matrixUser.userId, wechatyOptions)
      return wechaty.start()
    }
  )

  // wait all wechaty to be started
  await Promise.all(wechatyStartFutureList)

  // await bootstrap()
}

function createBridge (
  bridgeConfig   : BridgeConfig,
  appserviceManager: AppserviceManager,
  wechatyManager : WechatyManager,
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

  const matrixHandler = new MatrixHandler(
    appserviceManager,
    wechatyManager,
  )

  const onEvent = (
    request: Request,
    context: BridgeContext
  ) => matrixHandler.onEvent(
    request,
    context,
  )

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

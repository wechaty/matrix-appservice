import {
  Bridge,
  Request,
  BridgeContext,
}                   from 'matrix-appservice-bridge'

import {
  onUserQuery as matrixOnUserQuery,
  onEvent     as matrixOnEvent,
}                                     from '../matrix-handlers/'

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

  const wechatyManager    = new WechatyManager()
  const appserviceManager = new AppserviceManager()

  const matrixBridge = createBridge(
    bridgeConfig,
    appserviceManager,
    wechatyManager,
  )

  appserviceManager.bridge(matrixBridge)
  wechatyManager.bridge(matrixBridge)

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

  const onEvent = (
    request: Request,
    context: BridgeContext
  ) => matrixOnEvent(
    request,
    context,
    appserviceManager,
    wechatyManager,
  )

  const onUserQuery = (
    user: any
  ) => matrixOnUserQuery(
    user,
    appserviceManager,
    wechatyManager,
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

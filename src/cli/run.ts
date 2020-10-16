import {
  Bridge,
  Request,
  BridgeContext,
  MatrixUser,
  WeakEvent,
}                   from 'matrix-appservice-bridge'

import { AppserviceManager }  from '../appservice-manager'
import { MiddleManager }      from '../middle-manager'
import { DialogManager }      from '../dialog-manager'
import { MatrixHandler }      from '../matrix-handler'
import { UserManager }        from '../user-manager'
import { WechatyManager }     from '../wechaty-manager'

import { log }                from '../config'

import { BridgeConfig }       from './bridge-config-schema'

export async function run (
  port         : number,
  bridgeConfig : BridgeConfig,
): Promise<void> {
  log.info('cli', 'run(port=%s,)', port)

  const {
    appserviceManager,
    matrixHandler,
    userManager,
    wechatyManager,
  }                     = createManagers()

  const matrixBridge = createBridge(
    bridgeConfig,
    matrixHandler,
  )

  await matrixBridge.run(port, bridgeConfig)

  /**
   * setBridge() need to be after the matrixBridge.run() (started)
   */
  appserviceManager.setBridge(matrixBridge)

  const bridgeUserList = await userManager.list()

  const startWechaty = (matrixUser: MatrixUser) => {
    const wechatyOptions = userManager.wechatyOptions(matrixUser)
    const wechaty = wechatyManager.create(
      matrixUser.getId(),
      wechatyOptions,
    )
    return wechaty.start()
  }

  // wait all wechaty to be started
  await Promise.all(
    bridgeUserList.map(startWechaty)
  )
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

  // const domain        = 'chatie.io'
  // const homeServerUrl = 'http://matrix.chatie.io:8008'
  // const registrationFile  = REGISTRATION_FILE

  const onEvent = (
    request: Request<WeakEvent>,
    context?: BridgeContext
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

function createManagers () {
  const appserviceManager = new AppserviceManager()
  const wechatyManager    = new WechatyManager()

  const dialogManager = new DialogManager()
  const middleManager = new MiddleManager()
  const matrixHandler = new MatrixHandler()
  const userManager   = new UserManager()

  dialogManager.teamManager({
    appserviceManager,
    userManager,
    wechatyManager,
  })
  middleManager.teamManager({
    appserviceManager,
    wechatyManager,
  })
  matrixHandler.setManager({
    appserviceManager,
    dialogManager,
    middleManager,
    userManager,
    wechatyManager,
  })
  userManager.teamManager({
    appserviceManager,
  })
  wechatyManager.teamManager({
    appserviceManager,
    middleManager,
  })

  return {
    appserviceManager,
    matrixHandler,
    userManager,
    wechatyManager,
  }

}

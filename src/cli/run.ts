import {
  Bridge,
  Request,
  BridgeContext,
  MatrixUser,
}                   from 'matrix-appservice-bridge'

import { AppserviceManager }  from '../appservice-manager'
import { MapManager }         from '../map-manager'
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

  const appserviceManager = new AppserviceManager()
  const wechatyManager    = new WechatyManager()

  const dialogManager = new DialogManager()
  const mapManager    = new MapManager()
  const matrixHandler = new MatrixHandler()
  const userManager   = new UserManager()

  dialogManager.setManager({
    appserviceManager,
    userManager,
    wechatyManager,
  })
  mapManager.setManager({
    appserviceManager,
    wechatyManager,
  })
  matrixHandler.setManager({
    appserviceManager,
    dialogManager,
    mapManager,
    userManager,
    wechatyManager,
  })
  userManager.setManager({
    appserviceManager,
  })
  wechatyManager.setManager({
    appserviceManager,
    mapManager,
  })

  const matrixBridge = createBridge(
    bridgeConfig,
    matrixHandler,
  )

  await matrixBridge.run(port, bridgeConfig)

  /**
   * setBridge() need to be after the matrixBridge.run() (?)
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

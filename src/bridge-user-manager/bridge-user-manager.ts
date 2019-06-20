import {
  MatrixRoom,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
}                         from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                         from 'wechaty'

import { AppServiceManager } from '../appservice-manager'
import { WechatyManager } from '../wechaty-manager'
import {
  log,
}           from '../config'

const WECHATY_KEY = 'wechaty'

export class BridgeUserManager {

  private roomBridgeStore: RoomBridgeStore
  private userBridgeStore: UserBridgeStore

  constructor (
    private readonly appServiceManager: AppServiceManager,
  ) {
    log.verbose('BridgeUserManager', 'constructor()')

    if (!appServiceManager.roomBridgeStore
      || !appServiceManager.userBridgeStore
    ) {
      throw new Error('no BridgeStore found in AppServiceManager')
    }

    this.roomBridgeStore = appServiceManager.roomBridgeStore
    this.userBridgeStore = appServiceManager.userBridgeStore
  }

  public async register (
    matrixUser: MatrixUser,
  ): Promise<void> {
    log.verbose('BridgeUserManager', 'register(%s)', matrixUser.userId)

    const registered = await matrixUser.get(WECHATY_KEY)
    if (registered) {
      throw new Error(`matrix user ${matrixUser.userId} had already been registered before`)
    }

    matrixUser.set(WECHATY_KEY, true)
    await this.userBridgeStore.setMatrixUser(matrixUser)
  }

  public async deregister (
    matrixUser: MatrixUser,
  ): Promise<void> {
    log.verbose('BridgeUserManager', 'deregister(%s)', matrixUser.userId)

    matrixUser.set(WECHATY_KEY, false)
    await this.userBridgeStore.setMatrixUser(matrixUser)
  }

  public async getBridgeUserList (): Promise<MatrixUser[]> {
    log.verbose('BridgeUserManager', 'getBridgeUserList()')

    const queryFilter = {} as { [key: string]: boolean }
    queryFilter[WECHATY_KEY] = true
    const matrixUserList = await this.userBridgeStore.getByMatrixData(queryFilter)

    log.sill('BridgeUserManager', 'getBridgeUserList() found %s users', matrixUserList.length)

    return matrixUserList
  }

  /*******************
   * Private Methods *
   *******************/

}

import {
  Bridge,
  // MatrixRoom,
  // MatrixUser,
  // RoomBridgeStore,
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

import { BridgeUser } from './bridge-user'
import {
  wechatyQueryFilter,
  disableWechaty,
  wechatyEnabled,
  enableWechaty,
  wechatyConfig,
}                       from './wechaty-schema-helpers'

export class BridgeUserManager {

  private wechatyManager: WechatyManager

  // private roomBridgeStore: RoomBridgeStore
  private userBridgeStore: UserBridgeStore
  private bridge: Bridge

  constructor (
    appServiceManager: AppServiceManager,
  ) {
    log.verbose('BridgeUserManager', 'constructor()')

    if (appServiceManager.roomBridgeStore
      && appServiceManager.userBridgeStore
    ) {
      // this.roomBridgeStore = appServiceManager.roomBridgeStore
      this.userBridgeStore = appServiceManager.userBridgeStore
    } else {
      throw new Error('no BridgeStore found in AppServiceManager')
    }

    if (appServiceManager.wechatyManager) {
      this.wechatyManager = appServiceManager.wechatyManager
    } else {
      throw new Error('no wechaty manager found')
    }

    if (appServiceManager.bridge) {
      this.bridge = appServiceManager.bridge
    } else {
      throw new Error('no bridge found')
    }
  }

  public async register (
    matrixUserId    : string,
    wechatyOptions? : WechatyOptions,
  ): Promise<void> {
    log.verbose('BridgeUserManager', 'register(%s)', matrixUserId)

    const matrixUser = await this.userBridgeStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      throw new Error(`no matrix user for id ${matrixUserId}`)
    }

    if (wechatyEnabled(matrixUser)) {
      throw new Error(`matrix user ${matrixUserId} had already been registered before`)
    }

    enableWechaty(matrixUser, wechatyOptions)
    await this.userBridgeStore.setMatrixUser(matrixUser)

    const wechaty = this.wechatyManager.load(matrixUserId, wechatyOptions)
    await wechaty.start()
  }

  public async deregister (
    matrixUserId: string,
  ): Promise<void> {
    log.verbose('BridgeUserManager', 'deregister(%s)', matrixUserId)

    const matrixUser = await this.userBridgeStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      throw new Error(`no matrix user for id ${matrixUserId}`)
    }

    await disableWechaty(matrixUser)
    await this.userBridgeStore.setMatrixUser(matrixUser)

    await this.wechatyManager.destroy(matrixUserId)
  }

  public async getBridgeUserList (): Promise<BridgeUser[]> {
    log.verbose('BridgeUserManager', 'getBridgeUserList()')

    const queryFilter = wechatyQueryFilter()

    const matrixUserList = await this.userBridgeStore.getByMatrixData(queryFilter)

    log.silly('BridgeUserManager', 'getBridgeUserList() found %s users', matrixUserList.length)

    const bridgeUserList = matrixUserList.map(matrixUser => {
      const matrixUserId = matrixUser.userId

      const wechatyOptions = wechatyConfig(matrixUser)
      const wechaty = this.wechatyManager.load(matrixUserId, wechatyOptions)

      const bridgeUser = new BridgeUser(
        matrixUserId,
        this.bridge,
        wechaty,
      )

      return bridgeUser
    })

    return bridgeUserList
  }

  /*******************
   * Private Methods *
   *******************/

}

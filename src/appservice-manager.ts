import cuid from 'cuid'

import {
  Bridge,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  MatrixRoom,
}                       from 'matrix-appservice-bridge'

import {
  log,
}                       from './config'
import {
  Manager,
  Managers,
}                         from './manager'

export class AppserviceManager extends Manager {

  public bridge!    : Bridge
  public roomStore! : RoomBridgeStore
  public userStore! : UserBridgeStore

  public domain!    : string
  public localpart! : string

  constructor () {
    super()
    log.verbose('AppserviceManager', 'constructor()')
  }

  teamManager (managers: Managers) {
    // I'm the solo one!
    log.verbose('AppserviceManager', 'setManager(%s)', managers)
  }

  public setBridge (matrixBridge: Bridge): void {
    log.verbose('AppserviceManager', 'setBridge(bridge)')

    if (this.bridge) {
      throw new Error('bridge can not be set twice!')
    }

    this.bridge    = matrixBridge
    this.domain    = matrixBridge.opts.domain
    this.localpart = matrixBridge.opts.registration.sender_localpart

    const userBridgeStore = matrixBridge.getUserStore()
    const roomBridgeStore = matrixBridge.getRoomStore()

    if (!userBridgeStore) {
      throw new Error('can not get UserBridgeStore')
    }
    if (!roomBridgeStore) {
      throw new Error('can not get RoomBridgeStore')
    }
    this.roomStore = roomBridgeStore
    this.userStore = userBridgeStore
  }

  public appserviceUserId (): string {
    return [
      '@',
      this.localpart,
      ':',
      this.domain,
    ].join('')
  }

  public async appserviceUser (): Promise<MatrixUser> {
    const matrixUserId = this.appserviceUserId()
    const matrixUser = await this.userStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      throw new Error('no matrix user from store for id ' + matrixUserId)
    }
    return matrixUser
  }

  /**
   * Huan(202002) - To be confirmed: isVirtual is not include isBot
   */
  public isVirtual (matrixUserId: string): boolean {
    return this.bridge.getBot()
      .isRemoteUser(matrixUserId)
  }

  public isBot (matrixUserId: string): boolean {
    const appserviceUserId = this.appserviceUserId()
    return appserviceUserId === matrixUserId
  }

  public isUser (matrixUserId: string): boolean {
    return !(
      this.isBot(matrixUserId)
        || this.isVirtual(matrixUserId)
    )
  }

  public async directMessage (
    inMatrixRoom : MatrixRoom,
    withText     : string,
  ): Promise<void> {
    log.verbose('AppserviceManager', 'directMessage(%s, %s)',
      inMatrixRoom.getId(),
      withText,
    )

    const {
      directUserId,
    } = {
      ...inMatrixRoom.get(
        APPSERVICE_ROOM_DATA_KEY
      ),
    } as AppserviceMatrixRoomData

    if (!directUserId) {
      throw new Error(`room ${inMatrixRoom.getId()} is not a direct message room set by manager`)
    }

    try {
      const intent = this.bridge.getIntent(directUserId)
      await intent.sendText(
        inMatrixRoom.getId(),
        withText,
      )
    } catch (e) {
      log.error('AppserviceManager', 'directMessage() rejection for room ' + inMatrixRoom.getId())
      throw e
    }
  }

  public generateVirtualUserId () {
    return [
      '@',
      this.localpart,
      '_',
      cuid(),
      ':',
      this.domain,
    ].join('')
  }

  public storeQuery (
    dataKey    : string,
    filterData : object,
  ): {
    [key: string]: string,
  } {
    log.verbose('AppserviceManager', 'storeQuery(%s, "%s")',
      dataKey,
      JSON.stringify(filterData),
    )

    const query = {} as { [key: string]: string }

    for (let [key, value] of Object.entries(filterData)) {
      query[`${dataKey}.${key}`] = value
    }

    return query
  }

}

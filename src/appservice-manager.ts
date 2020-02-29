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

  public async sendMessage (
    withText  : string,
    toRoom    : MatrixRoom,
    fromUser? : MatrixUser,
  ) {
    log.verbose('AppserviceManager', 'sendMessage(%s, %s%s)',
      withText,
      toRoom.getId(),
      fromUser
        ? ', ' + fromUser.getId()
        : '',
    )

    try {
      const matrixUserId  = fromUser && fromUser.getId()

      const intent = this.bridge.getIntent(matrixUserId)

      await intent.sendText(
        toRoom.getId(),
        withText,
      )
    } catch (e) {
      log.error(`AppserviceManager', 'sendMessage() rejection from ${fromUser ? fromUser.getId() : 'BOT'} to room ${toRoom.getId()}`)
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

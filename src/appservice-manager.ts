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

export class AppserviceManager {

  public bridge!    : Bridge
  public roomStore! : RoomBridgeStore
  public userStore! : UserBridgeStore

  public domain!    : string
  public localpart! : string

  constructor () {
    log.verbose('AppserviceManager', 'constructor()')
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

  /**
   * Create a direct room between the consumer and the bot
   */
  async createDirectRoom (toConsumerMatrixUser: MatrixUser): Promise<MatrixRoom>
  /**
   * Create a direct room between the consumer and the virtual user
   */
  async createDirectRoom (toConsumerMatrixUser: MatrixUser, fromVirtualMatrixUser: MatrixUser, roomName: string): Promise<MatrixRoom>

  async createDirectRoom (
    toConsumerMatrixUser   : MatrixUser,
    fromVirtualMatrixUser? : MatrixUser,
    roomName?              : string,
  ): Promise<MatrixRoom> {
    log.verbose('AppserviceService', 'createDirectRoom(%s, %s, %s)',
      toConsumerMatrixUser.getId(),
      (fromVirtualMatrixUser && fromVirtualMatrixUser.getId()) || '',
      roomName || '',
    )

    const intent = this.bridge.getIntent(
      fromVirtualMatrixUser && fromVirtualMatrixUser.getId()
    )

    roomName = roomName
      ? roomName + APPSERVICE_NAME_POSTFIX
      : 'Wechaty Appservice Bot'

    const roomInfo = await intent.createRoom({
      createAsClient: true,
      options: {
        invite: [
          toConsumerMatrixUser.getId(),
        ],
        is_direct  : true,
        name       : roomName,
        preset     : 'trusted_private_chat',
        visibility : 'private',
      },
    })

    const matrixRoom = new MatrixRoom(roomInfo.room_id)

    const directUserId = fromVirtualMatrixUser
      ? fromVirtualMatrixUser.getId()
      : this.appserviceUserId()
    const consumerId = toConsumerMatrixUser.getId()

    const roomData = {
      consumerId,
      directUserId,
    } as AppserviceMatrixRoomData

    matrixRoom.set(APPSERVICE_ROOM_DATA_KEY, roomData)
    await this.roomStore.setMatrixRoom(matrixRoom)

    /**
     * Save this new created direct message room into matrix user data
     *
     * 1. If fromVirtualMatrixuser exist, this direct room is for it.
     * 2. If ther's only toConsumerMatrixUser been set,
     *  then it's direct message room between the consumer and the appservice bot.
     */
    await this.directMessageRoom(
      fromVirtualMatrixUser || toConsumerMatrixUser,
      matrixRoom,
    )

    return matrixRoom
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

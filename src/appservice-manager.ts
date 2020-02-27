import cuid from 'cuid'

import {
  Bridge,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  MatrixRoom,
}                               from 'matrix-appservice-bridge'
import {
  Contact as WechatyContact,
  Room    as WechatyRoom,
  WechatyOptions,
}                               from 'wechaty'

import {
  log,

  AppserviceMatrixRoomData,
  AppserviceMatrixUserData,
  AppserviceWechatyData,

  APPSERVICE_NAME_POSTFIX,

  APPSERVICE_ROOM_DATA_KEY,
  APPSERVICE_USER_DATA_KEY,
  APPSERVICE_WECHATY_DATA_KEY,
}                               from './config'

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

  public async enabledUserList (): Promise<MatrixUser[]> {
    log.verbose('AppserviceManager', 'enabledUserList()')

    const wechatyData = {
      enabled: true,
    } as AppserviceWechatyData

    const query = this.storeQuery(
      APPSERVICE_WECHATY_DATA_KEY,
      wechatyData,
    )

    const matrixUserList = await this.userStore.getByMatrixData(query)
    log.silly('AppserviceManager', 'enabledUserList() total number %s', matrixUserList.length)

    return matrixUserList
  }

  public wechatyOptions (matrixUser: MatrixUser, wechatyOptions: WechatyOptions): Promise<void>
  public wechatyOptions (matrixUser: MatrixUser): WechatyOptions

  public wechatyOptions (
    matrixUser      : MatrixUser,
    wechatyOptions? : WechatyOptions,
  ): Promise<void> | WechatyOptions {
    log.verbose('AppserviceManager', 'wechatyOptions(%s,%s)',
      matrixUser.getId(),
      wechatyOptions
        ? JSON.stringify(wechatyOptions)
        : '',
    )

    const that = this

    if (wechatyOptions) {
      return wechatyOptionsSet()
    } else {
      return wechatyOptionsGet()
    }

    function wechatyOptionsSet () {
      log.silly('AppserviceManager', 'wechatyOptionsSet(%s, "%s") SET',
        matrixUser.getId(), JSON.stringify(wechatyOptions))
      const wechatyData = {
        ...matrixUser.get(
          APPSERVICE_WECHATY_DATA_KEY
        ),
      } as AppserviceWechatyData

      wechatyData.wechatyOptions = wechatyOptions
      matrixUser.set(APPSERVICE_WECHATY_DATA_KEY, wechatyData)
      return that.userStore.setMatrixUser(matrixUser)
    }

    function wechatyOptionsGet () {
      log.silly('AppserviceManager', 'wechatyOptionsGet(%s)', matrixUser.getId())

      const wechatyData = {
        ...matrixUser.get(
          APPSERVICE_WECHATY_DATA_KEY
        ),
      } as AppserviceWechatyData

      log.silly('AppserviceManager', 'wechatyOptionsGet(%s) -> "%s"',
        matrixUser.getId(), JSON.stringify(wechatyData.wechatyOptions))

      return {
        ...wechatyData.wechatyOptions,
      }
    }
  }

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

  public isEnabled (matrixUser: MatrixUser): boolean {
    log.verbose('AppserviceManager', 'isEnabled(%s)', matrixUser.getId())

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
    } as AppserviceWechatyData

    log.silly('AppserviceManager', 'isEnable(%s) -> %s', matrixUser.getId(), wechatyData.enabled)
    return !!wechatyData.enabled
  }

  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'enable(%s)', matrixUser.getId())

    if (this.isEnabled(matrixUser)) {
      throw new Error(`matrixUserId ${matrixUser.getId()} has already enabled`)
    }

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
      enabled: true,
    } as AppserviceWechatyData

    matrixUser.set(
      APPSERVICE_WECHATY_DATA_KEY,
      wechatyData,
    )
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async disable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'disable(%s)', matrixUser.getId())

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
      enabled: false,
    } as AppserviceWechatyData

    matrixUser.set(
      APPSERVICE_WECHATY_DATA_KEY,
      wechatyData,
    )
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async matrixUser (ofWechatyContact: WechatyContact, forMatrixConsumer: null | MatrixUser) : Promise<MatrixUser>
  public async matrixUser (ofUserId: string)                                                       : Promise<MatrixUser>

  public async matrixUser (
    ofUserIdOrContact  : string | WechatyContact,
    forMatrixConsumer? : null | MatrixUser,
  ): Promise<MatrixUser> {
    log.verbose('AppserviceManager', 'matrixUser(%s, %s)',
      ofUserIdOrContact,
      forMatrixConsumer
        ? forMatrixConsumer.getId()
        : '',
    )

    const that = this

    if (ofUserIdOrContact instanceof WechatyContact) {
      return matrixUserOfContact(ofUserIdOrContact, forMatrixConsumer)
    } else {
      return matrixUserOfUserId(ofUserIdOrContact)
    }

    async function matrixUserOfUserId (id: string) {
      let matrixUser = await that.userStore.getMatrixUser(id)
      if (!matrixUser) {
        log.silly('AppserviceManager', 'matrixUser(%s) not exist in store, created.', id)
        matrixUser = new MatrixUser(id)
        await that.userStore.setMatrixUser(matrixUser)
      }
      return matrixUser
    }

    async function matrixUserOfContact (
      ofWechatyContact   : WechatyContact,
      forMatrixConsumer? : null | MatrixUser,
    ): Promise<MatrixUser> {
      if (!forMatrixConsumer) { throw new Error('matrix consumer is null') }

      log.verbose('AppserviceManager', 'matrixUserOfContact(%s, %s)',
        ofWechatyContact.id,
        forMatrixConsumer.getId(),
      )

      const userData: AppserviceMatrixUserData = {
        consumerId       : forMatrixConsumer.getId(),
        wechatyContactId : ofWechatyContact.id,
      }

      const query = that.storeQuery(
        APPSERVICE_USER_DATA_KEY,
        userData,
      )

      const matrixUserList = await that.userStore
        .getByMatrixData(query)

      const matrixUser = matrixUserList.length > 0
        ? matrixUserList[0]
        : that.generateMatrixUser(ofWechatyContact, userData)

      return matrixUser
    }

  }

  public async matrixRoom (ofWechatyRoom: WechatyRoom, forMatrixConsumer: null | MatrixUser) : Promise<MatrixRoom>
  public async matrixRoom (ofRoomId: string)                                          : Promise<MatrixRoom>

  public async matrixRoom (
    ofMatrixRoomIdOrWechatyRoom: string | WechatyRoom,
    forMatrixConsumer?: null | MatrixUser,
  ): Promise<MatrixRoom> {
    log.verbose('AppserviceManager', 'matrixRoom(%s,%s)',
      ofMatrixRoomIdOrWechatyRoom,
      forMatrixConsumer
        ? forMatrixConsumer.getId()
        : '',
    )

    const that = this

    if (ofMatrixRoomIdOrWechatyRoom instanceof WechatyRoom) {
      return matrixRoomOfWechatyRoom(ofMatrixRoomIdOrWechatyRoom, forMatrixConsumer)
    } else {
      return matrixRoomOfId(ofMatrixRoomIdOrWechatyRoom)
    }

    async function matrixRoomOfId (id: string): Promise<MatrixRoom> {
      let matrixRoom = await that.roomStore.getMatrixRoom(id)
      if (!matrixRoom) {
        log.silly('AppserviceManager', 'matrixRoomOfId(%s) not exist in store, created.', id)
        matrixRoom = new MatrixRoom(id)
        await that.roomStore.setMatrixRoom(matrixRoom)
      }
      return matrixRoom
    }

    async function matrixRoomOfWechatyRoom (
      ofWechatyRoom     : WechatyRoom,
      forMatrixConsumer?: null | MatrixUser,
    ): Promise<MatrixRoom> {
      if (!forMatrixConsumer) { throw new Error('matrix consumer is null') }
      log.verbose('AppserviceManager', 'matrixRoomOfWechatyRoom(%s, %s)',
        ofWechatyRoom.id,
        forMatrixConsumer.getId(),
      )

      const roomData = {
        consumerId    : forMatrixConsumer.getId(),
        wechatyRoomId : ofWechatyRoom.id,
      } as AppserviceMatrixRoomData

      const query = that.storeQuery(
        APPSERVICE_ROOM_DATA_KEY,
        roomData,
      )

      const entryList = await that.roomStore
        .getEntriesByMatrixRoomData(query)

      const matrixRoom = entryList.length > 0
        ? entryList[0].matrix
        : that.generateMatrixRoom(ofWechatyRoom, roomData)

      if (!matrixRoom) {
        throw new Error('entryList[0].matrix not found')
      }
      return matrixRoom
    }
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
   * GET / SET direct message room between matrix user and the bot
   */
  public async directMessageRoom (ofMatrixUser: MatrixUser)                           : Promise<null | MatrixRoom>
  public async directMessageRoom (ofMatrixUser: MatrixUser, toMatrixRoom: MatrixRoom) : Promise<void>

  public async directMessageRoom (
    ofMatrixUser  : MatrixUser,
    toMatrixRoom? : MatrixRoom,
  ): Promise<void | null | MatrixRoom> {
    log.verbose('AppserviceManager', 'directMessageRoom(%s%s)',
      ofMatrixUser.getId(),
      toMatrixRoom
        ? ', ' + toMatrixRoom.getId()
        : '',
    )

    const userData = {
      ...ofMatrixUser.get(
        APPSERVICE_USER_DATA_KEY
      ),
    } as AppserviceMatrixUserData

    console.info('DEBUG: userData: ', userData)

    const that = this

    if (toMatrixRoom) {                // SET
      return directMessageRoomSet()
    } else {                            // GET
      return directMessageRoomGet()
    }

    async function directMessageRoomGet () {
      const directRoomId = userData.directRoomId
      if (!directRoomId) {
        return null
      }

      let directMessageRoom = await that.roomStore
        .getMatrixRoom(directRoomId)
      if (!directMessageRoom) {
        throw new Error('no room found in store from id ' + directRoomId)
      }

      log.silly('AppserviceManager', 'directMessageRoomGet() return %s', directRoomId)
      return directMessageRoom
    }

    async function directMessageRoomSet () {
      if (!toMatrixRoom) {
        throw new Error('no toMatrixRoom')
      }
      if (userData.directRoomId) {
        log.error('AppserviceManager', 'directMessageRoomSet() directRoomId %s already exists for user %s, but someone want to replaced it with %s',
          userData.directRoomId,
          ofMatrixUser.getId(),
          toMatrixRoom.getId(),
        )
        throw new Error('direct message room id had already been set for ' + ofMatrixUser.getId())
      }
      userData.directRoomId = toMatrixRoom.getId()
      ofMatrixUser.set(APPSERVICE_USER_DATA_KEY, userData)

      await that.userStore.setMatrixUser(ofMatrixUser)
    }
  }

  /**
   * Create a direct room between the consumer and the bot
   */
  async createDirectRoom (toConsumerMatrixUser: MatrixUser): Promise<MatrixRoom>
  /**
   * Create a direct room between the consumer and the virtual user
   */
  async createDirectRoom (toConsumerMatrixUser: MatrixUser, fromVirtualMatrixUser?: MatrixUser, roomName?: string): Promise<MatrixRoom>

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

    const roomData   = {
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
     * then it's direct message room between the consumer and the appservice bot.
     */
    await this.directMessageRoom(
      fromVirtualMatrixUser || toConsumerMatrixUser,
      matrixRoom,
    )

    return matrixRoom
  }

  /*********************
   * Protected Methods *
   *********************/

  protected generateVirtualUserId () {
    return [
      '@',
      this.localpart,
      '_',
      cuid(),
      ':',
      this.domain,
    ].join('')
  }

  protected async generateMatrixUser (
    ofWechatyContact : WechatyContact,
    fromUserData     : AppserviceMatrixUserData,
  ): Promise<MatrixUser> {
    log.verbose('AppserviceManager', 'generateMatrixUser(%s, "%s")',
      ofWechatyContact.id,
      JSON.stringify(fromUserData),
    )

    const matrixUserId = this.generateVirtualUserId()
    const matrixUser   = new MatrixUser(matrixUserId)

    // fromUserData.avatar = ofWechatyContact.avatar()
    fromUserData.name   = ofWechatyContact.name() + APPSERVICE_NAME_POSTFIX

    matrixUser.set(APPSERVICE_USER_DATA_KEY, fromUserData)
    await this.userStore.setMatrixUser(matrixUser)

    return matrixUser
  }

  protected async generateMatrixRoom (
    fromWechatyRoom : WechatyRoom,
    withRoomData    : AppserviceMatrixRoomData,
  ): Promise<MatrixRoom> {
    const topic = await fromWechatyRoom.topic()
    log.verbose('AppserviceManager', 'generateMatrixRoom(%s, %s)',
      topic,
      JSON.stringify(withRoomData),
    )

    const consumer = await this.matrixUser(withRoomData.consumerId)

    const inviteeIdList: string[] = [
      consumer.getId(),
    ]

    for await (const member of fromWechatyRoom) {
      const matrixUser = await this.matrixUser(
        member,
        consumer,
      )
      inviteeIdList.push(matrixUser.getId())
    }

    const matrixRoom = await this.createGroupRoom(inviteeIdList, topic)

    matrixRoom.set(APPSERVICE_ROOM_DATA_KEY, withRoomData)
    await this.roomStore.setMatrixRoom(matrixRoom)

    return matrixRoom
  }

  /**
   * The group room will be created by the bot itself.
   *
   */
  protected async createGroupRoom (
    withMatrixIdList : string[],
    withName         : string,
  ): Promise<MatrixRoom> {
    log.verbose('AppserviceService', 'createGroupRoom([%s], %s)',
      withMatrixIdList.join(','),
      withName,
    )

    // use bot intent to create a group room
    const intent = this.bridge.getIntent()

    const roomInfo = await intent.createRoom({
      createAsClient: false,
      options: {
        invite     : withMatrixIdList,
        name       : withName + APPSERVICE_NAME_POSTFIX,
        visibility : 'private',
      },
    })

    const matrixRoom = new MatrixRoom(roomInfo.room_id)
    return matrixRoom
  }

  protected storeQuery (
    forDataKey : string,
    fromData   : AppserviceWechatyData| AppserviceMatrixRoomData | AppserviceMatrixUserData,
  ): {
    [key: string]: string,
  } {
    log.verbose('AppserviceManager', 'storeQuery(%s, "%s")',
      forDataKey,
      JSON.stringify(fromData),
    )

    const query = {} as { [key: string]: string }
    Object.keys(fromData).map(key => {
      const value = fromData[key as keyof typeof fromData]
      query[`${forDataKey}.${key}`] = value
    })
    return query
  }

}

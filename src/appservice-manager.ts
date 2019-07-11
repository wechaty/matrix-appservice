import {
  Bridge,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  MatrixRoom,
  RemoteUser,
}                   from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                   from 'wechaty'

import cuid from 'cuid'

import {
  log,
  MatrixUserWechatyData,
  WECHATY_DATA_KEY,
  WECHATY_LOCALPART,
  MatrixRoomWechatyData,
}                       from './config'

const REMOTE_CONTACT_DELIMITER = '<->'

export class AppserviceManager {

  public bridge!    : Bridge
  public roomStore! : RoomBridgeStore
  public userStore! : UserBridgeStore

  constructor () {
    log.verbose('AppserviceManager', 'constructor()')
  }

  public setBridge (matrixBridge: Bridge): void {
    log.verbose('AppserviceManager', 'bridge()')

    if (this.bridge) {
      throw new Error('bridge can not be set twice!')
    }

    this.bridge = matrixBridge

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
    const bridgeOpts = this.bridge.opts
    const localpart  = bridgeOpts.registration.sender_localpart
    const domain     = bridgeOpts.domain

    return [
      '@',
      localpart,
      ':',
      domain,
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

  public wechatyIdOf (
    remoteUser: RemoteUser,
  ): string {
    const remoteId = remoteUser.getId()
    // `${adminIdEscaped}${REMOTE_CONTACT_DELIMITER}${contactId}`

    const list = remoteId.split(REMOTE_CONTACT_DELIMITER)
    if (list.length !== 2 || list[1].length === 0) {
      throw new Error('fail to extract contact id from remote id ' + remoteId)
    }
    return list[1]
  }

  public remoteIdOf (
    contactOrRoomId : string,
    matrixConsumer  : MatrixUser,
  ): string {

    return [
      matrixConsumer.getId(),
      REMOTE_CONTACT_DELIMITER,
      contactOrRoomId,
    ].join('')
  }

  public async matrixUserList (): Promise<MatrixUser[]> {
    log.verbose('AppserviceManager', 'matrixUserList()')

    // TODO: use wechaty.enabled(?) to identify whether its a registered user
    const filter = {
      wechaty: {
        $exists: true,
        $ne: null,
      },
    }
    const matrixUserList = await this.userStore.getByMatrixData(filter)
    log.silly('AppserviceManager', 'matrixUserList() found %s users', matrixUserList.length)

    return matrixUserList
  }

  public wechatyOptions (matrixUser: MatrixUser, wechatyOptions: WechatyOptions): Promise<void>
  public wechatyOptions (matrixUser: MatrixUser): WechatyOptions

  public wechatyOptions (
    matrixUser      : MatrixUser,
    wechatyOptions? : WechatyOptions,
  ): Promise<void> | WechatyOptions {

    if (wechatyOptions) {
      // SET
      log.verbose('AppserviceManager', 'wechatyOptions(%s, "%s") SET',
        matrixUser.getId(), JSON.stringify(wechatyOptions))
      const data = matrixUser.get(WECHATY_DATA_KEY)
      matrixUser.set(WECHATY_DATA_KEY, {
        ...data,
        options: wechatyOptions,
      })
      return this.userStore.setMatrixUser(matrixUser)

    } else {
      // GET
      log.verbose('AppserviceManager', 'wechatyOptions(%s) GET', matrixUser.getId())

      const data = matrixUser.get(WECHATY_DATA_KEY) as undefined | any

      log.silly('AppserviceManager', 'wechatyOptions(%s) GOT "%s"',
        matrixUser.getId(), JSON.stringify(data && data.options))

      return {
        ...(data && data.options),
      }
    }

  }

  public isGhost (matrixUserId: string): boolean {
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
        || this.isGhost(matrixUserId)
    )
  }

  public isEnabled (matrixUser: MatrixUser): boolean {
    log.verbose('AppserviceManager', 'isEnable(%s)', matrixUser.getId())

    const data = matrixUser.get(WECHATY_DATA_KEY)

    // TODO: use explict variable to save enabled status
    const ret = !!data
    log.silly('AppserviceManager', 'isEnable(%s) -> %s', matrixUser.getId(), ret)
    return ret
  }

  // TODO: use explict var to store enable status
  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'enable(%s)', matrixUser.getId())

    if (this.isEnabled(matrixUser)) {
      throw new Error(`matrixUserId ${matrixUser.getId()} has already enabled`)
    }

    const data = {} as MatrixUserWechatyData

    matrixUser.set(WECHATY_DATA_KEY, data)
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async disable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'disable(%s)', matrixUser.getId())

    // TODO
    matrixUser.set(WECHATY_DATA_KEY, null)
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async matrixUserOf (matrixUserId: string)   : Promise<MatrixUser>
  public async matrixUserOf (remoteUser: RemoteUser) : Promise<MatrixUser>

  public async matrixUserOf (matrixUserIdOrRemoteUser: string | RemoteUser): Promise<MatrixUser> {

    const that = this

    if (matrixUserIdOrRemoteUser instanceof RemoteUser) {
      return matrixUserOfRemoteUser(matrixUserIdOrRemoteUser)
    } else {
      return matrixUserOfId(matrixUserIdOrRemoteUser)
    }

    async function matrixUserOfId (id: string): Promise<MatrixUser> {
      const user = await that.userStore.getMatrixUser(id)
      if (!user) {
        throw new Error(`can not get matrix user ${matrixUserIdOrRemoteUser} from store`)
      }
      return user
    }

    async function matrixUserOfRemoteUser (remoteUser: RemoteUser): Promise<MatrixUser> {
      const matrixUserList = await that.userStore
        .getMatrixUsersFromRemoteId(remoteUser.getId())

      if (matrixUserList.length === 0) {
        throw new Error('no matrix user linked to remote ' + remoteUser.getId())
      }
      const matrixUser = matrixUserList[0]
      return matrixUser
    }

  }

  public async directMessage (
    matrixRoom        : MatrixRoom,
    text              : string,
  ): Promise<void> {
    log.verbose('AppserviceManager', 'directMessage(%s, %s)',
      matrixRoom.getId(),
      text,
    )

    const roomData = { ...matrixRoom.get(WECHATY_DATA_KEY) } as MatrixRoomWechatyData
    if (!roomData.direct) {
      throw new Error(`room ${matrixRoom.getId()} is not a direct message room set by manager`)
    }

    const { serviceId } = roomData.direct

    try {
      await this.bridge.getIntent(serviceId).sendText(
        matrixRoom.getId(),
        text,
      )
    } catch (e) {
      log.error('AppserviceManager', 'directMessage() rejection for room ' + matrixRoom.getId())
      throw e
    }
  }

  /**
   * GET / SET direct message room between matrix user and the bot
   */
  public async directMessageRoomOf (matrixUser: MatrixUser)                         : Promise<null | MatrixRoom>
  public async directMessageRoomOf (matrixUser: MatrixUser, matrixRoom: MatrixRoom) : Promise<void>

  /**
   * GET / SET direct message room between matrix user and the wechaty contacts
   */
  public async directMessageRoomOf (remoteUser: RemoteUser)                         : Promise<null | MatrixRoom>
  public async directMessageRoomOf (remoteUser: RemoteUser, matrixRoom: MatrixRoom) : Promise<void>

  public async directMessageRoomOf (
    matrixOrRemoteUser : MatrixUser | RemoteUser,
    matrixRoom?        : MatrixRoom,
  ): Promise<void | null | MatrixRoom> {
    log.verbose('AppserviceManager', 'directMessageRoom(%s, %s)',
      matrixOrRemoteUser.getId(),
      (matrixRoom && matrixRoom.getId()) || '',
    )

    let userData = { ...matrixOrRemoteUser.get(WECHATY_DATA_KEY) } as MatrixUserWechatyData
    console.info('DEBUG: data', userData)
    const directMessageRoomId = userData.directMessageRoomId

    /**
     * GET
     */
    if (!matrixRoom) {

      if (!directMessageRoomId) {
        return null
      }

      let directMessageRoom = await this.roomStore.getMatrixRoom(directMessageRoomId)
      if (!directMessageRoom) {
        throw new Error('no room found in store from id ' + directMessageRoomId)
      }

      log.silly('AppserviceManager', 'directMessageRoom() return %s', directMessageRoomId)

      return directMessageRoom
    }

    /**
     * SET
     */
    if (directMessageRoomId) {
      throw new Error('direct message room id had already been set for ' + matrixOrRemoteUser.getId())
    }

    userData.directMessageRoomId = matrixRoom.getId()
    matrixOrRemoteUser.set(WECHATY_DATA_KEY, userData)

    if (matrixOrRemoteUser instanceof MatrixUser) {
      await this.userStore.setMatrixUser(matrixOrRemoteUser)
    } else {
      await this.userStore.setRemoteUser(matrixOrRemoteUser)
    }
  }

  async createDirectRoom (
    creator: MatrixUser,
    invitee: MatrixUser,
    name?  : string,
  ): Promise<MatrixRoom> {
    log.verbose('AppserviceService', 'createDirectRoom(%s, %s, "%s")',
      creator.getId(),
      invitee.getId(),
      name || '',
    )

    const intent = this.bridge.getIntent(creator.getId())

    const roomInfo = await intent.createRoom({
      createAsClient: true,
      options: {
        invite: [
          invitee.getId(),
        ],
        is_direct  : true,
        name,
        preset     : 'trusted_private_chat',
        visibility : 'private',
      },
    })

    let userId: string, serviceId: string
    if (this.isUser(creator.getId()) && !this.isUser(invitee.getId())) {
      userId    = creator.getId()
      serviceId = invitee.getId()
    } else if (this.isUser(invitee.getId()) && !this.isUser(creator.getId())) {
      userId    = invitee.getId()
      serviceId = creator.getId()
    } else {
      throw new Error(`direct room includes two user or two service ids: ${creator.getId()} and ${invitee.getId()}`)
    }

    const matrixRoom = new MatrixRoom(roomInfo.room_id)
    const roomData = {} as MatrixRoomWechatyData
    roomData.direct = {
      serviceId,
      userId,
    }
    matrixRoom.set(WECHATY_DATA_KEY, roomData)
    await this.roomStore.setMatrixRoom(matrixRoom)

    return matrixRoom
  }

  async createRoom (
    creatorId     : string,
    inviteeIdList : string[],
    name?         : string,
    topic?        : string,
  ): Promise<string> {
    log.verbose('AppserviceService', 'createRoom(%s, [%s], "%s", "%s")',
      creatorId,
      inviteeIdList.join(','),
      name || '',
      topic || '',
    )

    const intent = this.bridge.getIntent(creatorId)

    const roomInfo = await intent.createRoom({
      createAsClient: true,
      options: {
        invite: inviteeIdList,
        name,
        topic,
        visibility: 'private',
      },
    })

    return roomInfo.room_id
  }

  public generateGhostUserId () {
    return [
      '@',
      WECHATY_LOCALPART,
      '_',
      cuid(),
      ':',
      this.bridge.opts.domain,
    ].join('')
  }

  /*******************
   * Private Methods *
   *******************/

}

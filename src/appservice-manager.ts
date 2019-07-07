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
}                       from './config'

const REMOTE_CONTACT_SEPARATOR = '<->'

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

  public remoteToContactId (
    remoteUser: RemoteUser,
  ): string {
    const remoteId = remoteUser.getId()
    // `${adminIdEscaped}${REMOTE_CONTACT_SEPARATOR}${contactId}`

    const list = remoteId.split(REMOTE_CONTACT_SEPARATOR)
    if (list.length !== 2 || list[1].length === 0) {
      throw new Error('fail to extract contact id from remote id ' + remoteId)
    }
    return list[1]
  }

  public contactToRemoteId (
    contactId   : string,
    matrixAdmin : MatrixUser
  ): string {

    return [
      matrixAdmin.getId(),
      REMOTE_CONTACT_SEPARATOR,
      contactId,
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

  /**
   * GET / SET direct message room between matrix user and the bot
   */
  public async directMessageRoom (matrixUser: MatrixUser)                         : Promise<null | MatrixRoom>
  public async directMessageRoom (matrixUser: MatrixUser, matrixRoom: MatrixRoom) : Promise<void>

  /**
   * GET / SET direct message room between matrix user and the wechaty contacts
   */
  public async directMessageRoom (remoteUser: RemoteUser)                         : Promise<null | MatrixRoom>
  public async directMessageRoom (remoteUser: RemoteUser, matrixRoom: MatrixRoom) : Promise<void>

  public async directMessageRoom (
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

    // GET
    if (!matrixRoom) {
      log.silly('AppserviceManager', 'directMessageRoom() GET')

      if (!directMessageRoomId) {
        return null
      }

      let directMessageRoom = await this.roomStore.getMatrixRoom(directMessageRoomId)
      if (!directMessageRoom) {
        throw new Error('no room found in store from id ' + directMessageRoomId)
      }

      log.silly('AppserviceManager', 'directMessageRoom(%s) -> %s',
        matrixOrRemoteUser.getId(),
        directMessageRoomId,
      )

      return directMessageRoom
    }

    // SET
    log.silly('AppserviceManager', 'directMessageRoom() SET')

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
    creatorId: string,
    inviteeId: string,
    name?    : string,
  ): Promise<string> {
    log.verbose('AppserviceService', 'createDirectRoom(%s, %s, "%s")',
      creatorId,
      inviteeId,
      name || '',
    )

    const intent = this.bridge.getIntent(creatorId)

    const roomInfo = await intent.createRoom({
      createAsClient: true,
      options: {
        invite: [
          inviteeId,
        ],
        is_direct  : true,
        name,
        preset     : 'trusted_private_chat',
        visibility : 'private',
      },
    })

    return roomInfo.room_id
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

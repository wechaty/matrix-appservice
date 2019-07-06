import {
  Bridge,
  Intent,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  MatrixRoom,
  RemoteUser,
}                   from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                   from 'wechaty'

import {
  log,
  MatrixUserWechatyData,
  WECHATY_DATA_KEY,
}                       from './config'

export class AppserviceManager {

  public botIntent! : Intent
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

    this.botIntent       = matrixBridge.getIntent()

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

  public async matrixUserList (): Promise<MatrixUser[]> {
    log.verbose('AppserviceManager', 'matrixUserList()')

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
    matrixUser: MatrixUser,
    wechatyOptions?: WechatyOptions,
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

  public isEnabled (matrixUser: MatrixUser): boolean {
    log.verbose('AppserviceManager', 'isEnable(%s)', matrixUser.getId())

    const data = matrixUser.get(WECHATY_DATA_KEY)

    const ret = !!data
    log.silly('AppserviceManager', 'isEnable(%s) -> %s', matrixUser.getId(), ret)
    return ret
  }

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

    matrixUser.set(WECHATY_DATA_KEY, null)
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async directMessageRoom (remoteUser: RemoteUser)                         : Promise<null | MatrixRoom>
  public async directMessageRoom (remoteUser: RemoteUser, matrixRoom: MatrixRoom) : Promise<void>

  public async directMessageRoom (
    remoteUser  : RemoteUser,
    matrixRoom? : MatrixRoom,
  ): Promise<void | null | MatrixRoom> {
    log.verbose('AppserviceManager', 'directMessageRoom(%s, %s)',
      remoteUser.getId(),
      (matrixRoom && matrixRoom.getId()) || '',
    )

    let data = { ...remoteUser.get(WECHATY_DATA_KEY) } as MatrixUserWechatyData
    console.info('data', data)
    const directMessageRoomId = data.directMessageRoomId

    // SET
    if (matrixRoom) {
      log.silly('AppserviceManager', 'directMessageRoom() SET')

      if (directMessageRoomId) {
        throw new Error('direct message room id had already been set for ' + remoteUser.getId())
      }

      remoteUser.set(WECHATY_DATA_KEY, {
        ...data,
        directMessageRoomId: matrixRoom.getId(),
      })

      await this.userStore.setRemoteUser(remoteUser)
      return
    }

    // GET
    log.silly('AppserviceManager', 'directMessageRoom() GET')

    if (!directMessageRoomId) {
      return null
    }

    let directMessageRoom = await this.roomStore.getMatrixRoom(directMessageRoomId)
    if (!directMessageRoom) {
      throw new Error('no room found in store from id ' + directMessageRoomId)
    }

    log.silly('AppserviceManager', 'directMessageRoom(%s) -> %s',
      remoteUser.getId(),
      directMessageRoomId,
    )

    return directMessageRoom
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
        preset: 'trusted_private_chat',
        is_direct: true,
        visibility: 'private',
        invite: [
          inviteeId,
        ],
        name,
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
        visibility: 'private',
        invite: inviteeIdList,
        name,
        topic,
      },
    })

    return roomInfo.room_id
  }

  /*******************
   * Private Methods *
   *******************/

}

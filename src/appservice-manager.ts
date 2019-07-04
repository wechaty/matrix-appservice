import {
  Bridge,
  Intent,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
}                   from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                   from 'wechaty'

import {
  log,
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
        matrixUser.userId, JSON.stringify(wechatyOptions))
      const data = matrixUser.get('wechaty')
      matrixUser.set('wechaty', {
        ...data,
        options: wechatyOptions,
      })
      return this.userStore.setMatrixUser(matrixUser)

    } else {
      // GET
      log.verbose('AppserviceManager', 'wechatyOptions(%s) GET', matrixUser.userId)

      const data = matrixUser.get('wechaty') as undefined | any

      log.silly('AppserviceManager', 'wechatyOptions(%s) GOT "%s"',
        matrixUser.userId, JSON.stringify(data && data.options))

      return {
        ...(data && data.options),
      }
    }
  }

  public isEnabled (matrixUser: MatrixUser): boolean {
    log.verbose('AppserviceManager', 'isEnable(%s)', matrixUser.userId)

    const value = matrixUser.get('wechaty')
    return !!value
  }

  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'enable(%s)', matrixUser.userId)

    if (this.isEnabled(matrixUser)) {
      throw new Error(`matrixUserId ${matrixUser.userId} has already enabled`)
    }

    matrixUser.set('wechaty', {})
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async disable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'disable(%s)', matrixUser.userId)

    matrixUser.set('wechaty', null)
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async directMessageRoomId (matrixUserId: string): Promise<string> {
    log.verbose('AppserviceManager', 'directMessageRoomId(%s)', matrixUserId)

    const WECHATY_DIRECT_MESSAGE_ROOM_ID = 'wechaty.directMessageRoomId'

    const matrixUser = await this.userStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      throw new Error(`can not found matrix user from id ${matrixUserId}`)
    }
    const roomId = matrixUser.get(WECHATY_DIRECT_MESSAGE_ROOM_ID) as undefined | string
    if (roomId) {
      return roomId
    }

    // FIXME: todo
    return '!LeCbPwJxwjorqLHegf:aka.cn'

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

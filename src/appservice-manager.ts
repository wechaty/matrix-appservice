import {
  Bridge,
  Event,
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
        $ne: null,
      },
    }
    const matrixUserList = await this.userStore.getByMatrixData(filter)
    log.silly('AppserviceManager', 'getMatrixUserList() found %s users', matrixUserList.length)

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
      matrixUser.set('wechaty.options', wechatyOptions)
      return this.userStore.setMatrixUser(matrixUser)

    } else {
      // GET
      log.verbose('AppserviceManager', 'wechatyOptions(%s) GET', matrixUser.userId)

      wechatyOptions = matrixUser.get('wechaty.options') as undefined | object

      log.silly('AppserviceManager', 'wechatyOptions(%s) GOT "%s"',
        matrixUser.userId, JSON.stringify(wechatyOptions))

      return { ...wechatyOptions }
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

  public isRoomInvitation (event: Event): boolean {
    log.verbose('AppserviceManager', 'isRoomInvitation("%s")', JSON.stringify(event))
    return !!(
      event.type === 'm.room.member'
      && event.content && event.content.membership === 'invite'
      && event.state_key
    )
  }

  public async acceptRoomInvitation (
    event: Event,
  ): Promise<void> {
    log.verbose('AppserviceManager', 'acceptRoomInvitation({room_id:%s})', event.room_id)

    const inviteeMatrixUserId = event.state_key!
    const matrixRoomId        = event.room_id

    const intent = this.bridge.getIntent(inviteeMatrixUserId)

    await intent.join(matrixRoomId)
  }

  public isDirectRoom (
    matrixRoomId: string,
  ): boolean {
    log.verbose('AppserviceManager', 'isDriectRoom(%s)', matrixRoomId)

    // const matrixRoom = this.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
    // matrixRoom!.get('is_direct')

    const client = this.bridge.getClientFactory().getClientAs()
    const matrixClientRoom = client.getRoom(matrixRoomId)
    if (!matrixClientRoom) {
      return false
    }

    const dmInviter = matrixClientRoom.getDMInviter()

    return !!dmInviter
  }

  async isDirectRoom2 (
    matrixRoomId: string,
  ): Promise<boolean> {
    log.verbose('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s)', matrixRoomId)

    const roomStore = this.bridge.getRoomStore()
    if (!roomStore) {
      throw new Error('no room store')
    }

    const matrixRoom = roomStore.getMatrixRoom(matrixRoomId)
    if (!matrixRoom) {
      throw new Error('no matrix room')
    }

    let isDirect: boolean = matrixRoom.get('isDirect') as boolean
    if (typeof isDirect === 'boolean') {
      log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache hit)',
        matrixRoomId, isDirect)
      return isDirect
    }

    const memberMap = await this.bridge.getBot().getJoinedMembers(matrixRoomId)
    const memberNum = Object.keys(memberMap).length

    if (memberNum === 2) {
      isDirect = true
    } else {
      isDirect = false
    }
    log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache miss)',
      matrixRoomId, isDirect)

    matrixRoom.set('isDirect', isDirect)
    await roomStore.setMatrixRoom(matrixRoom)

    console.info('isDirect', isDirect)

    return isDirect
  }

  /*******************
   * Private Methods *
   *******************/

}

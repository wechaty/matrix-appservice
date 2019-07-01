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

  private botIntent! : Intent
  private matrixBridge!: Bridge
  private roomStore! : RoomBridgeStore
  private userStore! : UserBridgeStore

  constructor () {
    log.verbose('AppserviceManager', 'constructor()')
  }

  public bridge (): Bridge
  public bridge (matrixBridge: Bridge): void

  public bridge (matrixBridge?: Bridge): void | Bridge {

    if (!matrixBridge) {
      // GET
      log.verbose('AppserviceManager', 'bridge() GET')
      return this.matrixBridge
    }

    // SET
    log.verbose('AppserviceManager', 'bridge() SET')

    if (this.matrixBridge) {
      throw new Error('bridge can not be set twice!')
    }

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

      log.silly('AppserviceManager', 'wechatyOptions(%s, "%s") get',
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

  /*******************
   * Private Methods *
   *******************/

}

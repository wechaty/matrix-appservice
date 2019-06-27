import {
  Bridge,
  Intent,
  RoomBridgeStore,
  UserBridgeStore,
}                   from 'matrix-appservice-bridge'
// import {
//   WechatyOptions,
// }                   from 'wechaty'

import {
  log,
  REGISTRATION_FILE,
}                       from '../config'
import {
  WechatyManager,
}                       from '../wechaty-manager/'

import { onUserQuery }  from './on-user-query'
import { onEvent }      from './on-event'

export class AppServiceManager {

  public botIntent?       : Intent
  public bridge?          : Bridge
  public roomBridgeStore? : RoomBridgeStore
  public userBridgeStore? : UserBridgeStore
  public wechatyManager?  : WechatyManager

  constructor () {
    log.verbose('AppServiceManager', 'constructor()')
  }

  public connect (
    wechatyManager: WechatyManager,
  ): void {
    log.verbose('AppServiceManager', 'connectWechatyManager()')

    if (this.wechatyManager) {
      throw new Error('wechatyManager can not be set more than once')
    }
    this.wechatyManager = wechatyManager
  }

  public async start (
    port   : number,
    config : object,
  ): Promise<void> {
    log.verbose('AppServiceManager', 'start(%s, "%s")', port, JSON.stringify(config))

    if (!this.wechatyManager) {
      throw new Error(`there's no wechatyManager yet. call connect() first`)
    }

    const bridge = this.createBridge()
    await bridge.run(port, config)

    const botIntent = bridge.getIntent()
    const userBridgeStore = bridge.getUserStore()
    const roomBridgeStore = bridge.getRoomStore()

    if (!userBridgeStore) {
      throw new Error('can not get UserBridgeStore')
    }
    if (!roomBridgeStore) {
      throw new Error('can not get RoomBridgeStore')
    }

    this.botIntent       = botIntent
    this.bridge          = bridge
    this.roomBridgeStore = roomBridgeStore
    this.userBridgeStore = userBridgeStore
  }

  /*******************
   * Private methods *
   *******************/

  private createBridge (): Bridge {
    log.verbose('AppServiceManager', 'createBridge()')

    if (this.bridge) {
      throw new Error('bridge had already exist!')
    }

    const domain        = 'aka.cn'
    const homeserverUrl = 'http://matrix.aka.cn:8008'
    const registration  = REGISTRATION_FILE

    const controller = {
      onEvent     : onEvent.bind(this),
      onUserQuery : onUserQuery.bind(this),
    }

    const bridge = new Bridge({
      controller,
      domain,
      homeserverUrl,
      registration,
    })

    return bridge
  }

}

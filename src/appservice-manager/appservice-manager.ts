import { EventEmitter } from 'events'

import {
  Bridge,
  BridgeContext,
  Request,
}                       from 'matrix-appservice-bridge'

import {
  WechatyManager,
}                     from '../wechaty-manager/'

import {
  log,
  REGISTRATION_FILE,
}                     from '../config'

import { dispatchEvent } from './dispatch-event'

export class AppServiceManager extends EventEmitter {

  public bridge?         : Bridge
  public wechatyManager? : WechatyManager

  constructor () {
    log.verbose('AppServiceManager', 'constructor()')
    super()
  }

  public connect (
    wechatyManager: WechatyManager,
  ): void {
    log.verbose('AppServiceManager', 'connect()')

    if (this.wechatyManager) {
      throw new Error('wechatyManager can not be set more than once')
    }
    this.wechatyManager = wechatyManager
  }

  public async start (
    port   : number,
    config : object,
  ): Promise<void> {
    log.verbose('AppServiceManager', 'start(%s, %s)', port, JSON.stringify(config))

    if (this.bridge) {
      throw new Error('bridge had already been set!')
    }

    this.bridge = this.createBridge()
    await this.bridge.run(port, config)
  }

  /**
   * Main entrence
   */
  public async bootstrap (): Promise<void> {
    log.verbose('AppServiceManager', 'bootstrap(%s)')

    // const tester1 = bridge.getIntent('@wechaty_tester1:aka.cn')
    // const tester2 = bridge.getIntent('@wechaty_tester1:aka.cn')

    // TODO:

    const intent = this.bridge!.getIntent('@wechaty_' + 'tester' + ':aka.cn')

    const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'
    intent.sendText(ROOM_ID, 'hello matrix')
  }

  /**
   * Private methods
   */

  private createBridge () {
    log.verbose('AppServiceManager', 'createBridge()')

    const domain        = 'aka.cn'
    const homeserverUrl = 'http://matrix.aka.cn:8008'
    const registration  = REGISTRATION_FILE

    const controller = {
      onEvent     : this.onEvent.bind(this),
      onUserQuery : this.onUserQuery.bind(this),
    }

    const bridge = new Bridge({
      controller,
      domain,
      homeserverUrl,
      registration,
    })

    return bridge
  }

  private async onEvent (
    request: Request,
    context: BridgeContext,
  ): Promise<void> {
    log.verbose('AppServiceManager', 'onEvent({type: "%s"}, {userId: "%s"})', request.data.type, context.senders.matrix.userId)

    const event = request.getData()

    try {
      await dispatchEvent(this, event)
    } catch (e) {
      log.error('AppServiceManager', 'onEvent exception: %s', e && e.message)
    }
  }

  private onUserQuery (queriedUser: any): object {
    log.verbose('AppServiceManager', 'onUserQuery(%s)', queriedUser)
    return {} // auto-provision users with no additonal data
  }

}

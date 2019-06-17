import {
  Bridge,
  BridgeContext,
  Request,
}                 from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                 from 'wechaty'

import {
  log,
}                       from '../config'
import {
  WechatyManager,
}                       from '../wechaty-manager/'

import { bootstrap }    from './bootstrap'
import { createBridge } from './create-bridge'
import { onEvent }      from './on-event'
import { onUserQuery }  from './on-user-query'

export class AppServiceManager {

  public bridge?         : Bridge
  public wechatyManager? : WechatyManager

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

    this.bridge = this.createBridge()
    await this.bridge.run(port, config)
  }

  /**
   * Main entrence
   */
  public async bootstrap (): Promise<void> {
    log.verbose('AppServiceManager', 'bootstrap()')

    try {
      await bootstrap(this)
    } catch (e) {
      log.error('AppServiceManager', 'bootstrap() rejection: %s', e && e.message)
    }
  }

  public getWechatyOptionsList (): WechatyOptions[] {
    return [
      {
        name: 'test',
      },
    ]
  }

  public onEvent (
    request: Request,
    context: BridgeContext,
  ): void {
    log.verbose('AppServiceManager', 'onEvent()')

    onEvent(this, request, context)
      .catch(e => {
        log.error('AppServiceManager', 'onEvent() rejection: %s', e && e.message)
      })
  }

  public async onUserQuery (queriedUser: any): Promise<object> {
    log.verbose('AppServiceManager', 'onUserQuery()')

    try {
      const provision = await onUserQuery(this, queriedUser)
      return provision
    } catch (e) {
      log.error('AppServiceManager', 'onUserQuery() rejection: %s', e && e.message)
    }

    // auto-provision users with no additonal data
    return {}
  }

  /**
   * Private methods
   */
  private createBridge (): Bridge {
    log.verbose('AppServiceManager', 'createBridge()')

    if (this.bridge) {
      throw new Error('bridge had already exist!')
    }

    const bridge = createBridge(this)
    return bridge
  }

}

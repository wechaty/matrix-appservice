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

import { createBridge } from './create-bridge'
import {
  onEvent as onBridgeUserEvent,
  // onUserQuery as onBridgeUserUserQuery,
}                                           from '../bridge-user/matrix-handlers/'

import { BridgeUser } from '../bridge-user'

import {
  onNonBridgeUserEvent,
}                                           from './on-non-bridge-user-event'

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

  public getWechatyOptionsList (): [string, WechatyOptions][] {
    return [
      [
        '@huan:aka.cn',
        {
          name: 'test',
        },
      ],
    ]
  }

  public onEvent (
    request: Request,
    context: BridgeContext,
  ): void {
    log.verbose('AppServiceManager', 'onEvent()')

    const matrixUserId = context.senders.matrix.userId

    if (this.isBridgeUser(matrixUserId)) {
      const wechaty = this.wechatyManager!.get(matrixUserId)
      const bridgeUser = new BridgeUser(matrixUserId, this.bridge!, wechaty)

      onBridgeUserEvent.call(bridgeUser, request, context)
        .catch(e => {
          log.error('AppServiceManager', 'onEvent() onBridgeUserEvent() rejection: %s', e && e.message)
        })

    } else {

      onNonBridgeUserEvent.call(this, request, context)
        .catch(e => {
          log.error('AppServiceManager', 'onEvent() onNonBridgeUserEvent() rejection: %s', e && e.message)
        })

    }
  }

  public async onUserQuery (queriedUser: any): Promise<object> {
    log.verbose('AppServiceManager', 'onUserQuery("%s")', JSON.stringify(queriedUser))

    // if (isBridgeUser(matrixUserId)) {
    //   const wechaty = this.wechatyManager!.get(matrixUserId)
    //   const bridgeUser = new BridgeUser(matrixUserId, this.bridge!, wechaty)

    //   onBridgeUserUserQuery.call(bridgeUser, queriedUser)
    //     .catch(e => {
    //       log.error('AppServiceManager', 'onUserQuery() onBridgeUserUserQuery() rejection: %s', e && e.message)
    //     })
    // try {
    //   const provision = await onUserQuery.call(this, queriedUser)
    //   return provision
    // } catch (e) {
    //   log.error('AppServiceManager', 'onUserQuery() rejection: %s', e && e.message)
    // }

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

  private isBridgeUser (matrixUserId: string): boolean {
    // TODO:
    return !!matrixUserId
  }

}

import {
  Wechaty,
  WechatyOptions,
}                   from 'wechaty'

import { log } from '../config'

import { AppServiceManager } from '../appservice-manager/'

import {
  onScan,
  onLogin,
  onLogout,
  onMessage,
  BridgeUser,
}             from '../bridge-user-manager'

export class WechatyManager {

  public wechatyStore : Map<string,      Wechaty>
  // private nameStore    : WeakMap<Wechaty, string>

  constructor (
    public appServiceManager: AppServiceManager,
  ) {
    log.verbose('WechatyManager', 'constructor()')

    this.appServiceManager.connect(this)

    this.wechatyStore = new Map<string, Wechaty>()
    // this.nameStore    = new WeakMap<Wechaty, string>()
  }

  public async start (): Promise<void> {
    log.verbose('WechatyManager', 'start()')
  }

  public load (
    matrixUserId: string,
    wechatyOptions?: WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'load(%s,"%s")', matrixUserId, JSON.stringify(wechatyOptions))
    log.silly('WechatyManager', 'load() currently wechatyStore has %s wechaty instances.', this.wechatyStore.size)

    let wechaty = this.wechatyStore.get(matrixUserId)
    if (wechaty) {
      return wechaty
    }

    wechaty = this.createWechaty(matrixUserId)
    this.wechatyStore.set(matrixUserId, wechaty)

    return wechaty
  }

  public async destroy (
    matrixUserId: string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', matrixUserId)

    const wechaty = this.wechatyStore.get(matrixUserId)

    if (!wechaty) {
      throw new Error(`wechaty store no such key ${matrixUserId}`)
    }

    await wechaty.stop()

    this.wechatyStore.delete(matrixUserId)
  }

  private createWechaty (
    matrixUserId    : string,
    wechatyOptions? : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'createWechaty(%s,"%s")', matrixUserId, JSON.stringify(wechatyOptions))

    wechatyOptions = {
      ...wechatyOptions,
      name: matrixUserId,
    }

    const wechaty = new Wechaty(wechatyOptions)

    const bridgeUser = new BridgeUser(
      matrixUserId,
      this.appServiceManager!.bridge!,
      wechaty,
    )

    wechaty.on('scan',    (qrcode, status) => onScan.call(bridgeUser, qrcode, status))
    wechaty.on('login',   user => onLogin.call(bridgeUser, user))
    wechaty.on('logout',  user => onLogout.call(bridgeUser, user))
    wechaty.on('message', msg => onMessage.call(bridgeUser, msg))

    return wechaty
  }

}

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

  private store: Map<string, Wechaty>

  constructor (
    public appServiceManager: AppServiceManager,
  ) {
    log.verbose('WechatyManager', 'constructor()')

    this.appServiceManager.connect(this)

    this.store = new Map<string, Wechaty>()
  }

  public async start (): Promise<void> {
    log.verbose('WechatyManager', 'start()')
  }

  public load (
    matrixUserId    : string,
    wechatyOptions? : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'load(%s,"%s")', matrixUserId, JSON.stringify(wechatyOptions))
    log.silly('WechatyManager', 'load() currently wechatyStore has %s wechaty instances.', this.store.size)

    let wechaty = this.store.get(matrixUserId)
    if (wechaty) {
      return wechaty
    }

    wechaty = this.createWechaty(matrixUserId)
    this.store.set(matrixUserId, wechaty)

    return wechaty
  }

  public async destroy (
    matrixUserId: string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', matrixUserId)

    const wechaty = this.store.get(matrixUserId)

    if (!wechaty) {
      throw new Error(`wechaty store no such key ${matrixUserId}`)
    }

    await wechaty.stop()

    this.store.delete(matrixUserId)
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

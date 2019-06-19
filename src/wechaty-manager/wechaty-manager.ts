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
}             from '../bridge-user/'

export class WechatyManager {

  private appServiceManager? : AppServiceManager

  public wechatyStore : Map<string,      Wechaty>
  // private nameStore    : WeakMap<Wechaty, string>

  constructor () {
    log.verbose('WechatyManager', 'constructor()')

    this.wechatyStore = new Map<string,      Wechaty>()
    // this.nameStore    = new WeakMap<Wechaty, string>()
  }

  public connect (
    appServiceManager: AppServiceManager,
  ): void {
    log.verbose('WechatyManager', 'connect()')

    if (this.appServiceManager) {
      throw new Error('should not connect appServiceManager more than once.')
    }

    this.appServiceManager = appServiceManager
  }

  public async start (): Promise<void> {
    log.verbose('WechatyManager', 'start()')

    if (!this.appServiceManager) {
      throw new Error(`there's no appSrviceManager yet. call connect() first`)
    }
  }

  public get (name: string): Wechaty {
    log.verbose('WechatyManager', 'get(%s)', name)

    const wechaty = this.wechatyStore.get(name)
    if (!wechaty) {
      throw new Error(`wechaty store no such key ${name}`)
    }
    return wechaty
  }

  public async add (
    matrixUserId: string,
    wechatyOptions: WechatyOptions,
  ): Promise<void> {
    log.verbose('WechatyManager', 'add("%s")', JSON.stringify(wechatyOptions))

    const name = wechatyOptions.name
    if (!name) {
      throw new Error('wechaty manager needs a name to manage wechaty')
    }

    if (this.wechatyStore.has(name)) {
      throw new Error(`${name} is already exist`)
    }

    const wechaty = new Wechaty(wechatyOptions)
    await this.initWechaty(matrixUserId, wechaty)

    this.wechatyStore.set(name, wechaty)
  }

  public async del (
    name: string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'del(%s)', name)

    const wechaty = this.wechatyStore.get(name)

    if (!wechaty) {
      throw new Error(`wechaty store no such key ${name}`)
    }

    await wechaty.stop()

    this.wechatyStore.delete(name)
  }

  private async initWechaty (
    matrixUserId : string,
    wechaty      : Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'initWechaty(%s,)', matrixUserId)

    const bridgeUser = new BridgeUser(matrixUserId, this.appServiceManager!.bridge!, wechaty)

    wechaty.on('scan',    (qrcode, status) => onScan.call(bridgeUser, qrcode, status))
    wechaty.on('login',   user => onLogin.call(bridgeUser, user))
    wechaty.on('logout',  user => onLogout.call(bridgeUser, user))
    wechaty.on('message', msg => onMessage.call(bridgeUser, msg))
  }

}

import {
  Wechaty,
  WechatyOptions,
  ScanStatus,
  Contact,
  Message,
}                   from 'wechaty'

import { log } from './config'

import {
  onLogin   as wechatyOnLogin,
  onLogout  as wechatyOnLogout,
  onMessage as wechatyOnMessage,
  onScan    as wechatyOnScan,
}                                   from './wechaty-handlers'
import { AppserviceManager }        from './appservice-manager'

export class WechatyManager {

  private matrixWechatyDict: Map<string, Wechaty>
  private wechatyMatrixDict: WeakMap<Wechaty, string>

  constructor (
    public appserviceManager: AppserviceManager,
  ) {
    log.verbose('WechatyManager', 'constructor()')
    this.matrixWechatyDict = new Map<string, Wechaty>()
    this.wechatyMatrixDict = new WeakMap<Wechaty, string>()
  }

  public wechaty (
    matrixUserId: string,
  ): null | Wechaty {
    log.verbose('WechatyManager', 'wechaty(%s)', matrixUserId)
    log.silly('WechatyManager', 'wechaty() currently wechatyStore has %s wechaty instances.', this.matrixWechatyDict.size)

    let wechaty = this.matrixWechatyDict.get(matrixUserId)
    if (!wechaty) {
      return null
    }

    return wechaty
  }

  public create (
    matrixUserId    : string,
    wechatyOptions? : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'create(%s, "%s")',
      matrixUserId, JSON.stringify(wechatyOptions))

    const wechaty = new Wechaty(wechatyOptions)

    const onScan = (qrcode: string, status: ScanStatus) => wechatyOnScan.call(
      wechaty,
      qrcode,
      status,
      matrixUserId,
      this.appserviceManager,
    )

    const onLogin = (user: Contact) => wechatyOnLogin.call(
      wechaty,
      user,
      matrixUserId,
      this.appserviceManager,
    )

    const onLogout = (user: Contact) => wechatyOnLogout.call(
      wechaty,
      user,
      matrixUserId,
      this.appserviceManager,
    )

    const onMessage = (msg: Message) => wechatyOnMessage.call(
      wechaty,
      msg,
      matrixUserId,
      this.appserviceManager,
    )

    wechaty.on('login',   onLogin)
    wechaty.on('logout',  onLogout)
    wechaty.on('message', onMessage)
    wechaty.on('scan',    onScan)

    this.matrixWechatyDict.set(matrixUserId, wechaty)
    this.wechatyMatrixDict.set(wechaty, matrixUserId)

    return wechaty
  }

  public matrixUserId (wechaty: Wechaty): string {
    log.verbose('WechatyManager', 'matrixUserId(%s)', wechaty)

    const matrixUserId = this.wechatyMatrixDict.get(wechaty)
    if (!matrixUserId) {
      throw new Error('matrix user id not found for wechaty ' + wechaty)
    }
    return matrixUserId
  }

  public async destroy(matrixUserId: string): Promise<void>
  public async destroy(wechaty: Wechaty): Promise<void>

  public async destroy (
    matrixUserIdOrWechaty: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', matrixUserIdOrWechaty)

    let matrixUserId: undefined | string
    let wechaty: undefined | Wechaty

    if (matrixUserIdOrWechaty instanceof Wechaty) {
      wechaty = matrixUserIdOrWechaty
      matrixUserId = this.matrixUserId(wechaty)
    } else {
      matrixUserId = matrixUserIdOrWechaty
      wechaty = this.wechaty(matrixUserId)
    }

    try {
      await wechaty.stop()
    } catch (e) {
      log.error('WechatyManager', 'destroy() wechaty.stop() rejection: %s', e.message)
    }

    this.matrixWechatyDict.delete(matrixUserId)
    this.wechatyMatrixDict.delete(wechaty)
  }

  /*******************
   * Private methods *
   *******************/

}

import {
  Wechaty,
  WechatyOptions,
  ScanStatus,
  Contact,
  Message,
}                   from 'wechaty'

import {
  AGE_LIMIT,
  log,
}             from './config'

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

  public size (): number {
    return this.matrixWechatyDict.size
  }

  public create (
    matrixUserId    : string,
    wechatyOptions? : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'create(%s, "%s")',
      matrixUserId, JSON.stringify(wechatyOptions))

    if (this.matrixWechatyDict.has(matrixUserId)) {
      throw new Error('can not create twice for one user id: ' + matrixUserId)
    }

    const wechaty = new Wechaty({
      ...wechatyOptions,
      name: matrixUserId,
    })

    const onScan = (qrcode: string, status: ScanStatus) => this.onScan(
      qrcode,
      status,
      matrixUserId,
    )

    const onLogin = (user: Contact) => this.onLogin(
      user,
      matrixUserId,
    )

    const onLogout = (user: Contact) => this.onLogout(
      user,
      matrixUserId,
    )

    const onMessage = (msg: Message) => this.onMessage(
      msg,
      matrixUserId,
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

  public async destroy(matrixUserId:  string):  Promise<void>
  public async destroy(wechaty:       Wechaty): Promise<void>

  public async destroy (
    matrixUserIdOrWechaty: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', matrixUserIdOrWechaty)

    let matrixUserId: undefined | string
    let wechaty: null | Wechaty

    if (matrixUserIdOrWechaty instanceof Wechaty) {
      wechaty = matrixUserIdOrWechaty
      matrixUserId = this.matrixUserId(wechaty)
    } else {
      matrixUserId = matrixUserIdOrWechaty
      wechaty = this.wechaty(matrixUserId)
    }

    if (wechaty) {
      try {
        await wechaty.stop()
      } catch (e) {
        log.error('WechatyManager', 'destroy() wechaty.stop() rejection: %s', e.message)
      }

      /**
       * 1. Delete wechaty if exist
       */
      this.wechatyMatrixDict.delete(wechaty)

    } else {
      log.error('WechatyManager', 'destroy() can not get wechaty for id: ' + matrixUserId)
    }

    /**
     * 2. Delete matrixUserId
     */
    this.matrixWechatyDict.delete(matrixUserId)
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  async onLogin (
    user         : Contact,
    matrixUserId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s, %s)', user, matrixUserId)

    const matrixRoomId = await this.appserviceManager.directMessageRoomId(matrixUserId)

    await this.appserviceManager.botIntent.sendText(
      matrixRoomId,
      `${user} logout`,
    )

  }

  async onLogout (
    user         : Contact,
    matrixUserId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s, %s)', user, matrixUserId)

    const matrixRoomId = await this.appserviceManager.directMessageRoomId(matrixUserId)

    await this.appserviceManager.botIntent.sendText(
      matrixRoomId,
      `${user} logout`,
    )

  }

  async onMessage (
    msg               : Message,
    matrixUserId      : string,
  ) {
    log.verbose('WechatyManager', 'onMessage(%s, %s)', msg, matrixUserId)

    if (msg.age() > AGE_LIMIT) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', msg, matrixUserId)
      return
    }

    if (msg.self()) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', msg, matrixUserId)

      return
    }

    const matrixRoomId = await this.appserviceManager.directMessageRoomId(matrixUserId)

    await this.appserviceManager.botIntent.sendText(
      matrixRoomId,
      `recv message: ${msg}`,
    )
  }

  async onScan (
    qrcode            : string,
    status            : ScanStatus,
    matrixUserId      : string,
  ): Promise<void> {
    require('qrcode-terminal').generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('WechatyManager', 'onScan(%s,%s(%s), %s)',
      qrcodeImageUrl, statusName, status, matrixUserId)

    const matrixRoomId = await this.appserviceManager.directMessageRoomId(matrixUserId)

    await this.appserviceManager.botIntent.sendText(
      matrixRoomId,
      `Scan to login: ${qrcodeImageUrl}`,
    )

  }

}

import {
  Wechaty,
  WechatyOptions,
  ScanStatus,
  Contact,
  Message,
}                   from 'wechaty'

import {
  AGE_LIMIT_SECONDS,
  log,
}                             from './config'

import { AppserviceManager }  from './appservice-manager'
import { MiddleManager }      from './middle-manager'
import { Manager }            from './manager'

export class WechatyManager extends Manager {

  protected matrixWechatyDict: Map<string, Wechaty>
  protected wechatyMatrixDict: WeakMap<Wechaty, string>
  protected wechatyFilehelperDict: WeakMap<Wechaty, Contact>

  public appserviceManager!: AppserviceManager
  public middleManager!: MiddleManager

  constructor () {
    super()
    log.verbose('WechatyManager', 'constructor()')
    this.matrixWechatyDict     = new Map<string,      Wechaty>()
    this.wechatyMatrixDict     = new WeakMap<Wechaty, string>()
    this.wechatyFilehelperDict = new WeakMap<Wechaty, Contact>()
  }

  public teamManager (managers: {
    appserviceManager : AppserviceManager,
    middleManager     : MiddleManager,
  }) {
    this.appserviceManager = managers.appserviceManager
    this.middleManager     = managers.middleManager
  }

  public count (): number {
    return this.matrixWechatyDict.size
  }

  public create (
    matrixConsumerId : string,
    wechatyOptions?  : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'create(%s, "%s")',
      matrixConsumerId,
      JSON.stringify(wechatyOptions),
    )

    if (this.matrixWechatyDict.has(matrixConsumerId)) {
      throw new Error('can not create twice for one user id: ' + matrixConsumerId)
    }

    const wechaty = new Wechaty({
      ...wechatyOptions,
      name: matrixConsumerId,
    })

    const onScan = (qrcode: string, status: ScanStatus) => this.onScan(
      qrcode,
      status,
      wechaty,
    )

    const onLogin = (user: Contact) => this.onLogin(user)
    const onLogout = (user: Contact) => this.onLogout(user)
    const onMessage = (message: Message) => this.onMessage(message)

    wechaty.on('login',   onLogin)
    wechaty.on('logout',  onLogout)
    wechaty.on('message', onMessage)
    wechaty.on('scan',    onScan)

    this.matrixWechatyDict.set(matrixConsumerId, wechaty)
    this.wechatyMatrixDict.set(wechaty, matrixConsumerId)

    return wechaty
  }

  public async destroy(matrixConsumerId: string)  : Promise<void>
  public async destroy(wechaty:          Wechaty) : Promise<void>

  public async destroy (
    wechatyOrmatrixConsumerId: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s) (total %s instances)',
      wechatyOrmatrixConsumerId,
      this.count(),
    )

    let matrixConsumerId : undefined | string
    let wechaty          : null | Wechaty

    if (wechatyOrmatrixConsumerId instanceof Wechaty) {
      wechaty          = wechatyOrmatrixConsumerId
      matrixConsumerId = this.matrixOwnerId(wechaty)
    } else {
      matrixConsumerId = wechatyOrmatrixConsumerId
      wechaty       = this.wechaty(matrixConsumerId)
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
      log.error('WechatyManager', 'destroy() can not get wechaty for id: ' + matrixConsumerId)
    }

    /**
     * 2. Delete matrix consumer id
     */
    this.matrixWechatyDict.delete(matrixConsumerId)
  }

  public matrixOwnerId (ofWechaty: Wechaty): string {
    log.verbose('WechatyManager', 'ownerId(%s)', ofWechaty)

    const ownerId = this.wechatyMatrixDict.get(ofWechaty)
    if (!ownerId) {
      throw new Error('matrix user id not found for wechaty ' + ofWechaty)
    }
    return ownerId
  }

  public wechaty (
    ofMatrixConsumerId: string,
  ): null | Wechaty {
    log.verbose('WechatyManager', 'wechaty(%s) (total %s instances)',
      ofMatrixConsumerId,
      this.matrixWechatyDict.size,
    )

    let wechaty = this.matrixWechatyDict.get(ofMatrixConsumerId)
    if (!wechaty) {
      return null
    }

    return wechaty
  }

  public async filehelperOf (matrixConsumerId: string) : Promise<null | Contact>
  public async filehelperOf (wechaty: Wechaty)      : Promise<null | Contact>

  public async filehelperOf (
    wechatyOrmatrixConsumerId: string | Wechaty,
  ): Promise<null | Contact> {
    log.silly('WechatyManager', 'filehelperOf(%s)', wechatyOrmatrixConsumerId)

    let wechaty: null | Wechaty

    if (wechatyOrmatrixConsumerId instanceof Wechaty) {
      wechaty = wechatyOrmatrixConsumerId
    } else {
      wechaty = this.wechaty(wechatyOrmatrixConsumerId)
      if (!wechaty) {
        log.silly('WechatyManager', 'filehelperOf(%s) no wechaty found', wechatyOrmatrixConsumerId)
        return null
      }
    }

    if (!wechaty.logonoff()) {
      log.silly('WechatyManager', 'filehelperOf(%s) wechaty not loged in yet', wechaty)
      return null
    }

    let filehelper = this.wechatyFilehelperDict.get(wechaty) || null

    if (!filehelper) {
      filehelper = await wechaty.Contact.find({ id: 'filehelper' })
      if (filehelper) {
        this.wechatyFilehelperDict.set(wechaty, filehelper)
      }
    }
    if (!filehelper) {
      throw new Error('filehelper can not be found. maybe the wechaty is not full loaded.')
    }
    return filehelper
  }

  /****************************************************************************
   * Protected Methods                                                       *
   ****************************************************************************/

  protected async onScan (
    qrcode  : string,
    status  : ScanStatus,
    wechaty : Wechaty,
  ): Promise<void> {
    require('qrcode-terminal').generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('WechatyManager', 'onScan(%s,%s(%s), %s)',
      qrcodeImageUrl, statusName, status, wechaty)

    let text: string

    switch (status) {
      case ScanStatus.Waiting:
        text = `Scan to login: ${qrcodeImageUrl}`
        break
      case ScanStatus.Scanned:
        text = 'Scanned. Please confirm on your phone.'
        break
      case ScanStatus.Confirmed:
        text = 'Confirmed. Please waitting for Wechaty logging in.'
        break
      case ScanStatus.Timeout:
        text = 'QR Code expired. New QR Code are coming soon.'
        break
      default:
        text = `Scan Status: ${ScanStatus[status]}`
        break
    }

    await this.middleManager.directMessageFrom(wechaty.userSelf(), `${text}`)
  }

  protected async onLogin (
    wechatyContact: Contact,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s)', wechatyContact)

    const text = 'You are now logged in to Wechat. Your user name is: ' + wechatyContact.name()

    await this.middleManager.directMessageFrom(wechatyContact, text)

    // TODO(huan): clean all store for puppeteer relogin:
    // db.remove({}, { multi: true }, function (err, numRemoved) {})
  }

  protected async onLogout (
    wechatyContact   : Contact,
    // matrixConsumerId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s)', wechatyContact)

    const text = 'You are now logged out from Wechat. Your user name is: ' + wechatyContact.name()

    await this.middleManager.directMessageFrom(wechatyContact, text)
  }

  protected async onMessage (
    message          : Message,
    // matrixConsumerId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onMessage(%s) from %s to %s with age %s (timestamp: %s)',
      message,
      // matrixConsumerId,
      message.from()!.id,
      message.to()!.id,
      message.age(),
      (message as any).payload.timestamp,
    )

    if (message.age() > AGE_LIMIT_SECONDS) {
      log.silly('WechatyManager', 'onMessage() age %s > %s seconds', message.age(), AGE_LIMIT_SECONDS)
      return
    }

    if (message.self()) {
      log.silly('WechatyManager', 'onMessage() self() is true, skipped')
      return
    }

    // const matrixConsumer = await this.appserviceManager.matrixUser(matrixConsumerId)

    if (message.room()) {
      return this.processRoomMessage(message)
    } else {
      return this.processUserMessage(message)
    }
  }

  async processUserMessage (
    onWechatyMessage  : Message,
    // forMatrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processContactMessage(%s)',
      onWechatyMessage,
      // forMatrixConsumer.getId(),
    )

    const from = onWechatyMessage.from()
    if (!from) {
      throw new Error('can not found from contact for wechat message')
    }

    await this.middleManager.directMessageFrom(from, onWechatyMessage.text())
  }

  async processRoomMessage (
    onWechatyMessage  : Message,
    // forMatrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processRoomMessage(%s)',
      onWechatyMessage,
      // forMatrixConsumer.getId(),
    )

    const room = onWechatyMessage.room()
    if (!room) {
      throw new Error('no room')
    }
    const from = onWechatyMessage.from()
    if (!from) {
      throw new Error('no from')
    }

    const text = onWechatyMessage.text()

    const matrixRoom = await this.middleManager.matrixRoom(room)
    const matrixUser = await this.middleManager.matrixUser(from)

    await this.appserviceManager.sendMessage(
      text,
      matrixRoom,
      matrixUser,
    )
    // const matrixRoom = await this.appserviceManager.matrixRoom(room, forMatrixConsumer)
    // const matrixUser = await this.appserviceManager.matrixUser(
    //   from,
    //   forMatrixConsumer,
    // )

    // const intent = this.appserviceManager.bridge.getIntent(matrixUser.getId())
    // await intent.sendText(
    //   matrixRoom.getId(),
    //   text,
    // )
  }

}

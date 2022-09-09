import {
  WechatyOptions,
  ScanStatus,
  Contact,
  Message,
  WechatyBuilder,
  Wechaty,
}                   from 'wechaty'

import {
  AGE_LIMIT_SECONDS,
  log,
}                             from './config.js'

import type { AppserviceManager }  from './appservice-manager.js'
import type { MiddleManager }      from './middle-manager.js'
import { Manager }            from './manager.js'
import qrt from 'qrcode-terminal'

export class WechatyManager extends Manager {

  protected matrixWechatyDict: Map<string, Wechaty>
  protected wechatyMatrixDict: WeakMap<Wechaty, string>
  protected selfWechaty: Wechaty | undefined

  public appserviceManager!: AppserviceManager
  public middleManager!: MiddleManager

  constructor () {
    super()
    log.verbose('Wechatymanager', 'constructor()')
    this.matrixWechatyDict     = new Map<string,      Wechaty>()
    this.wechatyMatrixDict     = new WeakMap<Wechaty, string>()
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
    log.verbose('Wechatymanager', 'create(%s, "%s")',
      matrixConsumerId,
      JSON.stringify(wechatyOptions),
    )

    if (this.matrixWechatyDict.has(matrixConsumerId)) {
      throw new Error('can not create twice for one user id: ' + matrixConsumerId)
    }

    const wechaty = WechatyBuilder.build({
      ...wechatyOptions,
      name: matrixConsumerId,
    })

    const onLogin   = (user: Contact) => this.onLogin(user)
    const onLogout  = (user: Contact) => this.onLogout(user)
    const onMessage = (message: Message) => this.onMessage(message)
    const onScan    = (qrcode: string, status: ScanStatus) => this.onScan(
      qrcode,
      status,
      wechaty,
    )

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
    log.verbose('Wechatymanager', 'destroy(%s) (total %s instances)',
      wechatyOrmatrixConsumerId,
      this.count(),
    )

    let matrixConsumerId : undefined | string
    let wechaty          : null | Wechaty

    if (WechatyBuilder.valid(wechatyOrmatrixConsumerId)) {
      wechaty          = wechatyOrmatrixConsumerId
      matrixConsumerId = this.matrixConsumerId(wechaty)
    } else {
      matrixConsumerId = wechatyOrmatrixConsumerId
      wechaty       = this.wechaty(matrixConsumerId)
    }

    if (!wechaty) {
      log.error('Wechatymanager', 'destroy() can not get wechaty for id "%s"', matrixConsumerId)
      this.matrixWechatyDict.delete(matrixConsumerId)
      return
    }
    if (!matrixConsumerId) {
      log.error('Wechatymanager', 'destroy() can not get id for wechaty "%s"', wechaty)
      try {
        await wechaty.stop()
      } catch (e :any) {
        log.error('Wechatymanager', 'destroy() wechaty.stop() rejection: %s', e.message)
      }
      this.wechatyMatrixDict.delete(wechaty)
      return
    }

    try {
      await wechaty.stop()
    } catch (e: any) {
      log.error('WechatyManager', 'destroy() wechaty.stop() rejection: %s', e.message)
    } finally {
      this.wechatyMatrixDict.delete(wechaty)
      this.matrixWechatyDict.delete(matrixConsumerId)
    }
  }

  public matrixConsumerId (ofWechaty: Wechaty): string {
    log.verbose('Wechatymanager', 'consumerId(%s)', ofWechaty)

    const consumerId = this.wechatyMatrixDict.get(ofWechaty)
    if (!consumerId) {
      throw new Error('matrix user id not found for wechaty ' + ofWechaty)
    }
    return consumerId
  }

  public wechaty (
    ofMatrixConsumerId: string,
  ): null | Wechaty {
    log.verbose('Wechatymanager', 'wechaty(%s) (total %s instances)',
      ofMatrixConsumerId,
      this.matrixWechatyDict.size,
    )

    const wechaty = this.matrixWechatyDict.get(ofMatrixConsumerId)
    if (!wechaty) {
      return null
    }

    return wechaty
  }

  public async filehelperOf (matrixConsumerId: string) : Promise<null | Contact>
  public async filehelperOf (wechaty: Wechaty)         : Promise<null | Contact>

  public async filehelperOf (
    wechatyOrmatrixConsumerId: string | Wechaty,
  ): Promise<null | Contact> {
    log.silly('Wechatymanager', 'filehelperOf(%s)', wechatyOrmatrixConsumerId)

    let wechaty: null | Wechaty

    if (WechatyBuilder.valid(wechatyOrmatrixConsumerId)) {
      wechaty = wechatyOrmatrixConsumerId
    } else {
      wechaty = this.wechaty(wechatyOrmatrixConsumerId)
      if (!wechaty) {
        log.silly('Wechatymanager', 'filehelperOf(%s) no wechaty found', wechatyOrmatrixConsumerId)
        return null
      }
    }

    // if (!wechaty.logonoff()) {
    //   log.silly('Wechatymanager', 'filehelperOf(%s) wechaty not loged in yet', wechaty)
    //   return null
    // }

    const filehelper = await wechaty.Contact.find({ id: 'filehelper' })

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
    log.verbose('Wechatymanager', 'onScan(%s, %s)', qrcode, status)

    qrt.generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('Wechatymanager', 'onScan(%s, %s(%s), %s)',
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

    await this.middleManager.directMessageToMatrixConsumer(`${text}`, wechaty)
  }

  protected async onLogin (
    wechatyContact: Contact,
  ): Promise<void> {
    log.verbose('Wechatymanager', 'onLogin(%s)', wechatyContact)
    this.selfWechaty = wechatyContact.wechaty

    const text = 'You are now logged in to Wechat. Your user name is: ' + wechatyContact.name()

    const room = await this.middleManager.adminRoom(wechatyContact.wechaty)

    await this.appserviceManager.sendMessage(
      text,
      room,
    )
  }

  protected async onLogout (
    wechatyContact: Contact,
  ) {
    log.verbose('Wechatymanager', 'onLogout(%s)', wechatyContact)

    const text = [
      'You are now logged out from Wechat.',
      ` Your user name is: ${wechatyContact.name()}.`,
      ' send `!login` to me to get a new QR Code to scan for logging in.',
    ].join('')

    await this.middleManager.directMessageToMatrixConsumer(text, wechatyContact.wechaty)

    await wechatyContact.wechaty.stop()
  }

  protected async onMessage (
    message: Message,
  ): Promise<void> {
    log.verbose('Wechatymanager', 'onMessage("%s") from "%s" to "%s" with age "%s" (timestamp: "%s")',
      message,
      message.talker()!.id,
      (message.to() || message.room())!.id,
      message.age(),
      (message as any).payload.timestamp,
    )

    if (message.age() > AGE_LIMIT_SECONDS) {
      log.silly('Wechatymanager', 'onMessage() age %s > %s seconds', message.age(), AGE_LIMIT_SECONDS)
      return
    }

    if (message.self()) {
      log.silly('Wechatymanager', 'onMessage() self() is true, skipped')
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
    log.verbose('Wechatymanager', 'processContactMessage(%s)',
      onWechatyMessage,
      // forMatrixConsumer.getId(),
    )

    const talker = onWechatyMessage.talker()
    await this.middleManager.directMessageToMatrixConsumer(onWechatyMessage, talker)
  }

  async processRoomMessage (
    onWechatyMessage  : Message,
  ): Promise<void> {
    log.verbose('Wechatymanager', 'processRoomMessage(%s)',
      onWechatyMessage,
    )

    const room = onWechatyMessage.room()
    if (!room) {
      throw new Error('no room')
    }
    const talker = onWechatyMessage.talker()

    const matrixRoom = await this.middleManager.matrixRoom(room)
    const matrixUser = await this.middleManager.matrixUser(talker)

    await this.appserviceManager.sendMessage(
      onWechatyMessage,
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

  public ifSelfWechaty (wechatyId:string):boolean {
    return this.selfWechaty!.puppet.selfId() === wechatyId
  }

}

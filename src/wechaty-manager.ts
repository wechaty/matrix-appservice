import {
  MatrixUser,
  MatrixRoom,
}                   from 'matrix-appservice-bridge'
import {
  Wechaty,
  WechatyOptions,
  ScanStatus,
  Contact,
  Message,
  Room,
}                   from 'wechaty'

import {
  AGE_LIMIT_SECONDS,
  log,
  AppserviceMatrixRoomData,
  AppserviceMatrixUserData,
  APPSERVICE_USER_DATA_KEY,
  APPSERVICE_ROOM_DATA_KEY,
  APPSERVICE_NAME_POSTFIX,
}                             from './config'

import { AppserviceManager }  from './appservice-manager'

export class WechatyManager {

  protected matrixWechatyDict: Map<string, Wechaty>
  protected wechatyMatrixDict: WeakMap<Wechaty, string>

  constructor (
    public readonly appserviceManager: AppserviceManager,
  ) {
    log.verbose('WechatyManager', 'constructor()')
    this.matrixWechatyDict = new Map<string, Wechaty>()
    this.wechatyMatrixDict = new WeakMap<Wechaty, string>()
  }

  public count (): number {
    return this.matrixWechatyDict.size
  }

  public create (
    matrixConsumerId   : string,
    wechatyOptions? : WechatyOptions,
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
      matrixConsumerId,
    )

    const onLogin = (user: Contact) => this.onLogin(
      user,
      matrixConsumerId,
    )

    const onLogout = (user: Contact) => this.onLogout(
      user,
      matrixConsumerId,
    )

    const onMessage = (message: Message) => this.onMessage(
      message,
      matrixConsumerId,
    )

    wechaty.on('login',   onLogin)
    wechaty.on('logout',  onLogout)
    wechaty.on('message', onMessage)
    wechaty.on('scan',    onScan)

    this.matrixWechatyDict.set(matrixConsumerId, wechaty)
    this.wechatyMatrixDict.set(wechaty, matrixConsumerId)

    return wechaty
  }

  public async destroy(matrixConsumerId:  string): Promise<void>
  public async destroy(wechaty:       Wechaty): Promise<void>

  public async destroy (
    wechatyOrmatrixConsumerId: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', wechatyOrmatrixConsumerId)

    let matrixConsumerId : undefined | string
    let wechaty       : null | Wechaty

    if (wechatyOrmatrixConsumerId instanceof Wechaty) {
      wechaty       = wechatyOrmatrixConsumerId
      matrixConsumerId = this.matrixConsumerId(wechaty)
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

  public matrixConsumerId (ofWechaty: Wechaty): string {
    log.verbose('WechatyManager', 'matrixConsumerId(%s)', ofWechaty)

    const matrixConsumerId = this.wechatyMatrixDict.get(ofWechaty)
    if (!matrixConsumerId) {
      throw new Error('matrix user id not found for wechaty ' + ofWechaty)
    }
    return matrixConsumerId
  }

  public wechaty (
    ofMatrixConsumerId: string,
  ): null | Wechaty {
    log.verbose('WechatyManager', 'wechaty(%s)', ofMatrixConsumerId)
    log.silly('WechatyManager', 'wechaty() currently wechatyStore has %s wechaty instances.', this.matrixWechatyDict.size)

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

    if (typeof wechatyOrmatrixConsumerId === 'string') {
      wechaty = this.wechaty(wechatyOrmatrixConsumerId)
      if (!wechaty) {
        log.silly('WechatyManager', 'filehelperOf(%s) no wechaty found', wechatyOrmatrixConsumerId)
        return null
      }
      if (!wechaty.logonoff()) {
        log.silly('WechatyManager', 'filehelperOf(%s) wechaty not loged in yet', wechatyOrmatrixConsumerId)
        return null
      }
    } else {
      wechaty = wechatyOrmatrixConsumerId
    }

    const filehelper = await wechaty.Contact.find({ id: 'filehelper' })
    if (!filehelper) {
      throw new Error('can not find filehelper from wechaty')
    }
    return filehelper
  }

  public async wechatyContact (
    ofMatrixUser      : MatrixUser,
    forMatrixConsumer : MatrixUser,
  ): Promise<Contact> {
    log.verbose('WechatyManager', 'wechatyContact(%s, %s)',
      ofMatrixUser.getId(),
      forMatrixConsumer.getId(),
    )

    const {
      wechatyContactId,
    } = {
      ...ofMatrixUser.get(
        APPSERVICE_USER_DATA_KEY
      ),
    } as AppserviceMatrixUserData

    const wechaty = this.wechaty(forMatrixConsumer.getId())
    if (!wechaty) {
      throw new Error('no wechaty instance for matrix user id ' + forMatrixConsumer.getId())
    }

    const wechatyContact = await wechaty.Contact
      .find({ id: wechatyContactId })
    if (!wechatyContact) {
      throw new Error('no wechaty contact found for id: ' + wechatyContactId)
    }
    return wechatyContact
  }

  public async wechatyRoom (
    ofMatrixRoom      : MatrixRoom,
    forMatrixConsumer : MatrixUser,
  ): Promise<Room> {
    log.verbose('WechatyManager', 'wechatyRoom(%s, %s)',
      ofMatrixRoom.getId(),
      forMatrixConsumer.getId(),
    )

    const {
      wechatyRoomId,
    } = {
      ...ofMatrixRoom.get(
        APPSERVICE_ROOM_DATA_KEY
      ),
    } as AppserviceMatrixRoomData

    if (!wechatyRoomId) {
      throw new Error('no wechaty room id for matrix room ' + ofMatrixRoom.getId())
    }

    const wechaty = this.wechaty(forMatrixConsumer.getId())
    if (!wechaty) {
      throw new Error('no wechaty instance for matrix user id ' + forMatrixConsumer.getId())
    }

    const wechatyRoom = await wechaty.Room
      .find({ id: wechatyRoomId })
    if (!wechatyRoom) {
      throw new Error('no wechaty room found for id: ' + wechatyRoomId)
    }
    return wechatyRoom
  }

  /****************************************************************************
   * Protected Methods                                                       *
   ****************************************************************************/

  protected async onScan (
    qrcode        : string,
    status        : ScanStatus,
    matrixConsumerId : string,
  ): Promise<void> {
    require('qrcode-terminal').generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('WechatyManager', 'onScan(%s,%s(%s), %s)',
      qrcodeImageUrl, statusName, status, matrixConsumerId)

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

    const matrixConsumer  = await this.appserviceManager.matrixUser(matrixConsumerId)
    let directMessageRoom = await this.appserviceManager.directMessageRoom(matrixConsumer)

    if (!directMessageRoom) {
      directMessageRoom = await this.appserviceManager.createDirectRoom(matrixConsumer)
    }
    await this.appserviceManager.directMessage(directMessageRoom, `${text}`)
  }

  protected async onLogin (
    wechatyContact   : Contact,
    matrixConsumerId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s, %s)', wechatyContact, matrixConsumerId)

    const matrixConsumer    = await this.appserviceManager.matrixUser(matrixConsumerId)
    const directMessageRoom = await this.appserviceManager.directMessageRoom(matrixConsumer)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${wechatyContact} logined.`)
    } else {
      log.error('WechatyManager', 'onLogin() no directMessageRoom found to %s', matrixConsumerId)
    }

    // clean all store for puppeteer relogin:
    // db.remove({}, { multi: true }, function (err, numRemoved) {})
  }

  protected async onLogout (
    wechatyContact   : Contact,
    matrixConsumerId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s, %s)', wechatyContact, matrixConsumerId)

    const matrixConsumer    = await this.appserviceManager.matrixUser(matrixConsumerId)
    const directMessageRoom = await this.appserviceManager.directMessageRoom(matrixConsumer)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${wechatyContact} logouted.`)
    } else {
      log.error('WechatyManager', 'onLogout() no directMessageRoom found to %s', matrixConsumerId)
    }
  }

  protected async onMessage (
    message          : Message,
    matrixConsumerId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onMessage(%s, %s) with age %s (timestamp: %s)',
      message,
      matrixConsumerId,
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

    const matrixConsumer = await this.appserviceManager.matrixUser(matrixConsumerId)

    if (message.room()) {
      return this.processRoomMessage(message, matrixConsumer)
    } else {
      return this.processContactMessage(message, matrixConsumer)
    }
  }

  async processContactMessage (
    onWechatyMessage  : Message,
    forMatrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processContactMessage(%s, %s)',
      onWechatyMessage,
      forMatrixConsumer.getId(),
    )

    const from = onWechatyMessage.from()
    if (!from) {
      throw new Error('can not found from contact for wechat message')
    }

    const virtualMatrixUser  = await this.matrixUser(from, forMatrixConsumer)

    let matrixRoom = await this.appserviceManager.directMessageRoom(virtualMatrixUser)

    if (!matrixRoom) {
      log.silly('WechatyManager', 'onMessage() creating direct chat room for remote user "%s"', virtualMatrixUser.getId())

      matrixRoom = await this.appserviceManager.createDirectRoom(
        forMatrixConsumer,
        virtualMatrixUser,
        from.name(),
      )
    }

    await this.appserviceManager
      .directMessage(
        matrixRoom,
        onWechatyMessage.text(),
      )
  }

  async processRoomMessage (
    onWechatyMessage  : Message,
    forMatrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processRoomMessage(%s, %s)',
      onWechatyMessage,
      forMatrixConsumer.getId(),
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

    const matrixRoom = await this.matrixRoom(room, forMatrixConsumer)
    const matrixUser = await this.matrixUser(
      from,
      forMatrixConsumer,
    )

    const intent = this.appserviceManager.bridge.getIntent(matrixUser.getId())
    await intent.sendText(
      matrixRoom.getId(),
      text,
    )

  }

  protected async matrixUser (
    ofWechatyContact  : Contact,
    forMatrixConsumer : null | MatrixUser,
  ): Promise<MatrixUser> {
    if (!forMatrixConsumer) { throw new Error('matrix consumer is null') }

    log.verbose('WechatyManager', 'matrixUser(%s, %s)',
      ofWechatyContact.id,
      forMatrixConsumer.getId(),
    )

    const userData: AppserviceMatrixUserData = {
      consumerId       : forMatrixConsumer.getId(),
      wechatyContactId : ofWechatyContact.id,
    }

    const query = this.appserviceManager
      .storeQuery(
        APPSERVICE_USER_DATA_KEY,
        userData,
      )

    const matrixUserList = await this.appserviceManager.userStore
      .getByMatrixData(query)

    const matrixUser = matrixUserList.length > 0
      ? matrixUserList[0]
      : this.generateMatrixUser(ofWechatyContact, userData)

    return matrixUser
  }

  protected async generateMatrixUser (
    ofWechatyContact : Contact,
    fromUserData     : AppserviceMatrixUserData,
  ): Promise<MatrixUser> {
    log.verbose('WechatyManager', 'generateMatrixUser(%s, "%s")',
      ofWechatyContact.id,
      JSON.stringify(fromUserData),
    )

    const matrixUserId = this.appserviceManager.generateVirtualUserId()
    const matrixUser   = new MatrixUser(matrixUserId)

    // fromUserData.avatar = ofWechatyContact.avatar()
    fromUserData.name   = ofWechatyContact.name() + APPSERVICE_NAME_POSTFIX

    matrixUser.set(APPSERVICE_USER_DATA_KEY, fromUserData)
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)

    return matrixUser
  }

  protected async matrixRoom (
    ofWechatyRoom     : Room,
    forMatrixConsumer : null | MatrixUser,
  ): Promise<MatrixRoom> {
    if (!forMatrixConsumer) { throw new Error('matrix consumer is null') }
    log.verbose('WechatyManager', 'matrixRoomOf(%s, %s)',
      ofWechatyRoom.id,
      forMatrixConsumer.getId(),
    )

    const roomData = {
      consumerId    : forMatrixConsumer.getId(),
      wechatyRoomId : ofWechatyRoom.id,
    } as AppserviceMatrixRoomData

    const query = this.appserviceManager
      .storeQuery(
        APPSERVICE_ROOM_DATA_KEY,
        roomData,
      )

    const entryList = await this.appserviceManager.roomStore
      .getEntriesByMatrixRoomData(query)

    const matrixRoom = entryList.length > 0
      ? entryList[0].matrix
      : this.generateMatrixRoom(ofWechatyRoom, roomData)

    if (!matrixRoom) {
      throw new Error('entryList[0].matrix not found')
    }
    return matrixRoom
  }

  protected async generateMatrixRoom (
    fromWechatyRoom : Room,
    withRoomData    : AppserviceMatrixRoomData,
  ): Promise<MatrixRoom> {
    const topic = await fromWechatyRoom.topic()
    log.verbose('WechatyManager', 'generateMatrixRoom(%s, %s)',
      topic,
      JSON.stringify(withRoomData),
    )

    const consumer = await this.appserviceManager
      .matrixUser(withRoomData.consumerId)

    const inviteeIdList: string[] = [
      consumer.getId(),
    ]

    for await (const member of fromWechatyRoom) {
      const matrixUser = await this.matrixUser(
        member,
        consumer,
      )
      inviteeIdList.push(matrixUser.getId())
    }

    const matrixRoom = await this.appserviceManager
      .createRoom(inviteeIdList, topic)

    matrixRoom.set(APPSERVICE_ROOM_DATA_KEY, withRoomData)
    await this.appserviceManager.roomStore
      .setMatrixRoom(matrixRoom)

    return matrixRoom
  }

}

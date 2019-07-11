import {
  RemoteUser,
  MatrixUser,
  RemoteRoom,
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
  WECHATY_DATA_KEY,
  MatrixRoomWechatyData,
}                       from './config'

import { AppserviceManager }        from './appservice-manager'

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

  public matrixConsumerId (wechaty: Wechaty): string {
    log.verbose('WechatyManager', 'matrixConsumerId(%s)', wechaty)

    const matrixConsumerId = this.wechatyMatrixDict.get(wechaty)
    if (!matrixConsumerId) {
      throw new Error('matrix user id not found for wechaty ' + wechaty)
    }
    return matrixConsumerId
  }

  public wechaty (
    matrixConsumerId: string,
  ): null | Wechaty {
    log.verbose('WechatyManager', 'wechaty(%s)', matrixConsumerId)
    log.silly('WechatyManager', 'wechaty() currently wechatyStore has %s wechaty instances.', this.matrixWechatyDict.size)

    let wechaty = this.matrixWechatyDict.get(matrixConsumerId)
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

    const matrixConsumer       = await this.appserviceManager.matrixUserOf(matrixConsumerId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixConsumer)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${text}`)
    } else {
      log.error('WechatyManager', 'onScan() no directMessageRoom found to %s', matrixConsumerId)
    }
  }

  protected async onLogin (
    user          : Contact,
    matrixConsumerId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s, %s)', user, matrixConsumerId)

    const matrixConsumer       = await this.appserviceManager.matrixUserOf(matrixConsumerId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixConsumer)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${user} logined.`)
    } else {
      log.error('WechatyManager', 'onLogin() no directMessageRoom found to %s', matrixConsumerId)
    }

    // clean all store for puppeteer relogin:
    // db.remove({}, { multi: true }, function (err, numRemoved) {})
  }

  protected async onLogout (
    user          : Contact,
    matrixConsumerId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s, %s)', user, matrixConsumerId)

    const matrixConsumer       = await this.appserviceManager.matrixUserOf(matrixConsumerId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixConsumer)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${user} logouted.`)
    } else {
      log.error('WechatyManager', 'onLogout() no directMessageRoom found to %s', matrixConsumerId)
    }
  }

  protected async onMessage (
    message       : Message,
    matrixConsumerId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onMessage(%s, %s)', message, matrixConsumerId)

    if (message.age() > AGE_LIMIT_SECONDS) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', message, matrixConsumerId)
      return
    }

    if (message.self()) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', message, matrixConsumerId)
      return
    }

    const matrixConsumer = await this.appserviceManager.matrixUserOf(matrixConsumerId)

    if (message.room()) {
      return this.processRoomMessage(message, matrixConsumer)
    } else {
      return this.processContactMessage(message, matrixConsumer)
    }
  }

  async processContactMessage (
    message     : Message,
    matrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processContactMessage(%s, %s)',
      message, matrixConsumer.getId())

    const sender = message.from()
    if (!sender) {
      throw new Error('can not found from contact for wechat message')
    }

    const remoteUser  = await this.remoteUserOf(sender, matrixConsumer)

    let matrixRoom = await this.appserviceManager.directMessageRoomOf(remoteUser)

    if (!matrixRoom) {
      log.silly('WechatyManager', 'onMessage() creating direct chat room for remote user "%s"', remoteUser.getId())

      const matrixUser = await this.appserviceManager.matrixUserOf(remoteUser)

      matrixRoom = await this.appserviceManager.createDirectRoom(
        matrixUser,
        matrixConsumer,
        sender.name(),
      )
      await this.appserviceManager.directMessageRoomOf(remoteUser, matrixRoom)
    }

    await this.appserviceManager.directMessage(matrixRoom, message.toString())
  }

  async processRoomMessage (
    wechatyMessage : Message,
    matrixConsumer : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processRoomMessage(%s, %s)',
      wechatyMessage, matrixConsumer.getId())

    const room = wechatyMessage.room()
    if (!room) {
      throw new Error('no room')
    }

    const matrixRoom = await this.matrixRoomOf(room, matrixConsumer)


  }

  // TODO: call it from somewhere
  public async remoteUserToContact (
    remoteUser  : RemoteUser,
    matrixConsumer : MatrixUser,
  ): Promise<Contact> {
    log.verbose('WechatyManager', 'remoteUserToContact(%s, %s)',
      remoteUser.getId(),
      matrixConsumer.getId(),
    )

    const wechaty = this.wechaty(matrixConsumer.getId())
    const contactId = this.appserviceManager.wechatyIdOf(remoteUser)

    if (!wechaty) {
      throw new Error('no wechaty for id ' + matrixConsumer.getId())
    }

    const contact = await wechaty.Contact.find({ id: contactId })
    if (!contact) {
      throw new Error('no contact')
    }
    return contact
  }

  protected async remoteUserOf (
    wechatyContact : Contact,
    matrixConsumer    : null | MatrixUser,
  ): Promise<RemoteUser> {
    if (!matrixConsumer) {
      throw new Error('matrix consumer is null')
    }
    log.verbose('WechatyManager', 'remoteUserOf(%s, %s)',
      wechatyContact.id,
      matrixConsumer.getId(),
    )

    const remoteUserId = this.appserviceManager.remoteIdOf(wechatyContact.id, matrixConsumer)
    let   remoteUser   = await this.appserviceManager.userStore.getRemoteUser(remoteUserId)

    if (!remoteUser) {
      remoteUser = new RemoteUser(remoteUserId)
      await this.appserviceManager.userStore.setRemoteUser(remoteUser)
      log.silly('WechatyManager', 'remoteUserOf() remote user id %s not in store. created.', remoteUserId)
    }

    let matrixGhostUserList = await this.appserviceManager.userStore.getMatrixUsersFromRemoteId(remoteUserId)
    if (matrixGhostUserList.length === 0) {
      const ghostUserId     = this.appserviceManager.generateGhostUserId()
      const matrixGhostUser = new MatrixUser(ghostUserId)
      await this.appserviceManager.userStore.linkUsers(matrixGhostUser, remoteUser)
      log.silly('WechatyManager', 'remoteUserOf() created new ghost "%s" linked to remote "%s"',
        ghostUserId,
        remoteUserId,
      )
    }

    return remoteUser
  }

  protected async matrixRoomOf (
    wechatyRoom    : Room,
    matrixConsumer : null | MatrixUser,
  ): Promise<MatrixRoom> {

    if (!matrixConsumer) { throw new Error('matrix consumer is null') }

    log.verbose('WechatyManager', 'matrixRoomOf(%s, %s)',
      wechatyRoom.id,
      matrixConsumer.getId(),
    )

    const wechatyRoomData = {
      group: {
        wechatyRoomId   : wechatyRoom.id,
        matrixConsumerId : matrixConsumer.getId(),
      }
    } as MatrixRoomWechatyData

    const queryFilter = {} as { [k: string]: string }
    Object.keys(wechatyRoomData).map(k1 => {
      const section = wechatyRoomData[k1 as keyof MatrixRoomWechatyData]
      Object.keys(section).map(k2 => {
        queryFilter[`${WECHATY_DATA_KEY}.${k1}.${k2}`] = wechatyRoomData[k1][k2]
      })
    })

    const entryList = await this.appserviceManager.roomStore
      .getEntriesByMatrixRoomData(queryFilter)

    let remoteRoom: RemoteRoom

    if (entryList.length === 0) {
      remoteRoom = new RemoteUser(remoteRoomId)
      log.silly('WechatyManager', 'matrixRoomOf() remote user id %s not in store. created.', remoteRoomId)
    } else {
      remoteRoom = entryList[0].
    }

    let matrixGhostUserList = await this.appserviceManager.userStore.getMatrixUsersFromRemoteId(remoteRoomId)
    if (matrixGhostUserList.length === 0) {
      const ghostUserId     = this.appserviceManager.generateGhostUserId()
      const matrixGhostUser = new MatrixUser(ghostUserId)
      await this.appserviceManager.userStore.linkUsers(matrixGhostUser, remoteRoom)
      log.silly('WechatyManager', 'matrixRoomOf() created new ghost "%s" linked to remote "%s"',
        ghostUserId,
        remoteRoomId,
      )
    }

    return remoteRoom
  }

}

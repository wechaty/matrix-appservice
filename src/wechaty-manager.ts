import {
  RemoteUser,
  MatrixUser,
  RemoteRoom,
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
    matrixAdminId   : string,
    wechatyOptions? : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'create(%s, "%s")',
      matrixAdminId,
      JSON.stringify(wechatyOptions),
    )

    if (this.matrixWechatyDict.has(matrixAdminId)) {
      throw new Error('can not create twice for one user id: ' + matrixAdminId)
    }

    const wechaty = new Wechaty({
      ...wechatyOptions,
      name: matrixAdminId,
    })

    const onScan = (qrcode: string, status: ScanStatus) => this.onScan(
      qrcode,
      status,
      matrixAdminId,
    )

    const onLogin = (user: Contact) => this.onLogin(
      user,
      matrixAdminId,
    )

    const onLogout = (user: Contact) => this.onLogout(
      user,
      matrixAdminId,
    )

    const onMessage = (message: Message) => this.onMessage(
      message,
      matrixAdminId,
    )

    wechaty.on('login',   onLogin)
    wechaty.on('logout',  onLogout)
    wechaty.on('message', onMessage)
    wechaty.on('scan',    onScan)

    this.matrixWechatyDict.set(matrixAdminId, wechaty)
    this.wechatyMatrixDict.set(wechaty, matrixAdminId)

    return wechaty
  }

  public async destroy(matrixAdminId:  string): Promise<void>
  public async destroy(wechaty:       Wechaty): Promise<void>

  public async destroy (
    wechatyOrMatrixAdminId: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', wechatyOrMatrixAdminId)

    let matrixAdminId : undefined | string
    let wechaty       : null | Wechaty

    if (wechatyOrMatrixAdminId instanceof Wechaty) {
      wechaty       = wechatyOrMatrixAdminId
      matrixAdminId = this.matrixAdminId(wechaty)
    } else {
      matrixAdminId = wechatyOrMatrixAdminId
      wechaty       = this.wechaty(matrixAdminId)
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
      log.error('WechatyManager', 'destroy() can not get wechaty for id: ' + matrixAdminId)
    }

    /**
     * 2. Delete matrix admin id
     */
    this.matrixWechatyDict.delete(matrixAdminId)
  }

  public matrixAdminId (wechaty: Wechaty): string {
    log.verbose('WechatyManager', 'matrixAdminId(%s)', wechaty)

    const matrixAdminId = this.wechatyMatrixDict.get(wechaty)
    if (!matrixAdminId) {
      throw new Error('matrix user id not found for wechaty ' + wechaty)
    }
    return matrixAdminId
  }

  public wechaty (
    matrixAdminId: string,
  ): null | Wechaty {
    log.verbose('WechatyManager', 'wechaty(%s)', matrixAdminId)
    log.silly('WechatyManager', 'wechaty() currently wechatyStore has %s wechaty instances.', this.matrixWechatyDict.size)

    let wechaty = this.matrixWechatyDict.get(matrixAdminId)
    if (!wechaty) {
      return null
    }

    return wechaty
  }

  public async filehelperOf (matrixAdminId: string) : Promise<null | Contact>
  public async filehelperOf (wechaty: Wechaty)      : Promise<null | Contact>

  public async filehelperOf (
    wechatyOrMatrixAdminId: string | Wechaty,
  ): Promise<null | Contact> {
    log.silly('WechatyManager', 'filehelperOf(%s)', wechatyOrMatrixAdminId)

    let wechaty: null | Wechaty

    if (typeof wechatyOrMatrixAdminId === 'string') {
      wechaty = this.wechaty(wechatyOrMatrixAdminId)
      if (!wechaty) {
        log.silly('WechatyManager', 'filehelperOf(%s) no wechaty found', wechatyOrMatrixAdminId)
        return null
      }
      if (!wechaty.logonoff()) {
        log.silly('WechatyManager', 'filehelperOf(%s) wechaty not loged in yet', wechatyOrMatrixAdminId)
        return null
      }
    } else {
      wechaty = wechatyOrMatrixAdminId
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
    matrixAdminId : string,
  ): Promise<void> {
    require('qrcode-terminal').generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('WechatyManager', 'onScan(%s,%s(%s), %s)',
      qrcodeImageUrl, statusName, status, matrixAdminId)

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

    const matrixAdmin       = await this.appserviceManager.matrixUserOf(matrixAdminId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixAdmin)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${text}`)
    } else {
      log.error('WechatyManager', 'onScan() no directMessageRoom found to %s', matrixAdminId)
    }
  }

  protected async onLogin (
    user          : Contact,
    matrixAdminId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s, %s)', user, matrixAdminId)

    const matrixAdmin       = await this.appserviceManager.matrixUserOf(matrixAdminId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixAdmin)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${user} logined.`)
    } else {
      log.error('WechatyManager', 'onLogin() no directMessageRoom found to %s', matrixAdminId)
    }

    // clean all store for puppeteer relogin:
    // db.remove({}, { multi: true }, function (err, numRemoved) {})
  }

  protected async onLogout (
    user          : Contact,
    matrixAdminId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s, %s)', user, matrixAdminId)

    const matrixAdmin       = await this.appserviceManager.matrixUserOf(matrixAdminId)
    const directMessageRoom = await this.appserviceManager.directMessageRoomOf(matrixAdmin)

    if (directMessageRoom) {
      await this.appserviceManager.directMessage(directMessageRoom, `${user} logouted.`)
    } else {
      log.error('WechatyManager', 'onLogout() no directMessageRoom found to %s', matrixAdminId)
    }
  }

  protected async onMessage (
    message       : Message,
    matrixAdminId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onMessage(%s, %s)', message, matrixAdminId)

    if (message.age() > AGE_LIMIT_SECONDS) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', message, matrixAdminId)
      return
    }

    if (message.self()) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', message, matrixAdminId)
      return
    }

    const matrixAdmin = await this.appserviceManager.matrixUserOf(matrixAdminId)

    if (message.room()) {
      return this.processRoomMessage(message, matrixAdmin)
    } else {
      return this.processContactMessage(message, matrixAdmin)
    }
  }

  async processContactMessage (
    message     : Message,
    matrixAdmin : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processContactMessage(%s, %s)',
      message, matrixAdmin.getId())

    const sender = message.from()
    if (!sender) {
      throw new Error('can not found from contact for wechat message')
    }

    const remoteUser  = await this.remoteUserOf(sender, matrixAdmin)

    let matrixRoom = await this.appserviceManager.directMessageRoomOf(remoteUser)

    if (!matrixRoom) {
      log.silly('WechatyManager', 'onMessage() creating direct chat room for remote user "%s"', remoteUser.getId())

      const matrixUser = await this.appserviceManager.matrixUserOf(remoteUser)

      matrixRoom = await this.appserviceManager.createDirectRoom(
        matrixUser,
        matrixAdmin,
        sender.name(),
      )
      await this.appserviceManager.directMessageRoomOf(remoteUser, matrixRoom)
    }

    await this.appserviceManager.directMessage(matrixRoom, message.toString())
  }

  async processRoomMessage (
    message     : Message,
    matrixAdmin : MatrixUser,
  ): Promise<void> {
    log.verbose('WechatyManager', 'processRoomMessage(%s, %s)',
      message, matrixAdmin.getId())

    const room = message.room()
    if (!room) {
      throw new Error('no room')
    }

    const remoteRoom = await this.remoteRoomOf(room, matrixAdmin)


  }

  // TODO: call it from somewhere
  public async remoteUserToContact (
    remoteUser  : RemoteUser,
    matrixAdmin : MatrixUser,
  ): Promise<Contact> {
    log.verbose('WechatyManager', 'remoteUserToContact(%s, %s)',
      remoteUser.getId(),
      matrixAdmin.getId(),
    )

    const wechaty = this.wechaty(matrixAdmin.getId())
    const contactId = this.appserviceManager.wechatyIdOf(remoteUser)

    if (!wechaty) {
      throw new Error('no wechaty for id ' + matrixAdmin.getId())
    }

    const contact = await wechaty.Contact.find({ id: contactId })
    if (!contact) {
      throw new Error('no contact')
    }
    return contact
  }

  protected async remoteUserOf (
    contact     : Contact,
    matrixAdmin : null | MatrixUser,
  ): Promise<RemoteUser> {
    if (!matrixAdmin) {
      throw new Error('matrix admin is null')
    }
    log.verbose('WechatyManager', 'remoteUserOf(%s, %s)',
      contact.id,
      matrixAdmin.getId(),
    )

    const remoteUserId = this.appserviceManager.remoteIdOf(contact.id, matrixAdmin)
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

  protected async remoteRoomOf (
    room        : Room,
    matrixAdmin : null | MatrixUser,
  ): Promise<RemoteRoom> {
    if (!matrixAdmin) {
      throw new Error('matrix admin is null')
    }
    log.verbose('WechatyManager', 'remoteRoomOf(%s, %s)',
      room.id,
      matrixAdmin.getId(),
    )

    const remoteRoomId = this.appserviceManager.remoteIdOf(room.id, matrixAdmin)
    const entryList    = await this.appserviceManager.roomStore.getEntriesByRemoteId(remoteRoomId)

    let remoteRoom: RemoteRoom

    if (entryList.length === 0) {
      remoteRoom = new RemoteUser(remoteRoomId)
      log.silly('WechatyManager', 'remoteRoomOf() remote user id %s not in store. created.', remoteRoomId)
    } else {
      remoteRoom = entryList[0].
    }

    let matrixGhostUserList = await this.appserviceManager.userStore.getMatrixUsersFromRemoteId(remoteRoomId)
    if (matrixGhostUserList.length === 0) {
      const ghostUserId     = this.appserviceManager.generateGhostUserId()
      const matrixGhostUser = new MatrixUser(ghostUserId)
      await this.appserviceManager.userStore.linkUsers(matrixGhostUser, remoteRoom)
      log.silly('WechatyManager', 'remoteRoomOf() created new ghost "%s" linked to remote "%s"',
        ghostUserId,
        remoteRoomId,
      )
    }

    return remoteRoom
  }

}

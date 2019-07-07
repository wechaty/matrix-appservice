import {
  RemoteUser,
  MatrixUser,
}                   from 'matrix-appservice-bridge'
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
}                       from './config'

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
    matrixAdminId    : string,
    wechatyOptions?  : WechatyOptions,
  ): Wechaty {
    log.verbose('WechatyManager', 'create(%s, "%s")',
      matrixAdminId, JSON.stringify(wechatyOptions))

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

    const onMessage = (msg: Message) => this.onMessage(
      msg,
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

  public async destroy(matrixAdminId:  string):  Promise<void>
  public async destroy(wechaty:       Wechaty): Promise<void>

  public async destroy (
    matrixAdminIdOrWechaty: string | Wechaty,
  ): Promise<void> {
    log.verbose('WechatyManager', 'destroy(%s)', matrixAdminIdOrWechaty)

    let matrixAdminId: undefined | string
    let wechaty: null | Wechaty

    if (matrixAdminIdOrWechaty instanceof Wechaty) {
      wechaty = matrixAdminIdOrWechaty
      matrixAdminId = this.matrixAdminId(wechaty)
    } else {
      matrixAdminId = matrixAdminIdOrWechaty
      wechaty = this.wechaty(matrixAdminId)
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
     * 2. Delete
     */
    this.matrixWechatyDict.delete(matrixAdminId)
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  private async onLogin (
    user          : Contact,
    matrixAdminId : string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'onLogin(%s, %s)', user, matrixAdminId)

    const matrixAdmin = await this.appserviceManager.userStore
      .getMatrixUser(matrixAdminId)
    if (!matrixAdmin) {
      throw new Error('matrix user not found for id ' + matrixAdminId)
    }

    const matrixRoom = await this.appserviceManager.directMessageRoom(matrixAdmin)

    if (!matrixRoom) {
      log.error('WechatyManager', 'onLogin() matrixRoom not found')
      return
    }

    await this.appserviceManager.botIntent.sendText(
      matrixRoom.getId(),
      `${user} login`,
    )

  }

  private async onLogout (
    user          : Contact,
    matrixAdminId : string,
  ) {
    log.verbose('WechatyManager', 'onLogout(%s, %s)', user, matrixAdminId)

    const matrixAdmin = await this.appserviceManager.userStore
      .getMatrixUser(matrixAdminId)
    if (!matrixAdmin) {
      throw new Error('matrix user not found for id ' + matrixAdminId)
    }

    const remoteUser = await this.contactToRemoteUser(user, matrixAdmin)
    const matrixRoom = await this.appserviceManager.directMessageRoom(remoteUser)
    await this.appserviceManager.userStore.unlinkUsers(matrixAdmin, remoteUser)

    if (!matrixRoom) {
      log.error('WechatyManager', 'onLogout() matrixRoomId not found')
      return
    }

    await this.appserviceManager.botIntent.sendText(
      matrixRoom.getId(),
      `${user} logout`,
    )

  }

  private async onMessage (
    msg               : Message,
    matrixAdminId     : string,
  ) {
    log.verbose('WechatyManager', 'onMessage(%s, %s)', msg, matrixAdminId)

    if (msg.age() > AGE_LIMIT) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', msg, matrixAdminId)
      return
    }

    if (msg.self()) {
      log.silly('WechatyManager', 'onMessage(%s, %s)', msg, matrixAdminId)

      return
    }

    const matrixAdmin = await this.appserviceManager.userStore
      .getMatrixUser(matrixAdminId)
    if (!matrixAdmin) {
      throw new Error('matrix user not found for id ' + matrixAdminId)
    }

    const from = msg.from()
    if (!from) {
      throw new Error('can not found from contact for wechat message')
    }

    const remoteUser = await this.contactToRemoteUser(from, matrixAdmin)
    const matrix

    let matrixRoom = await this.appserviceManager.directMessageRoom(remoteUser)

    if (!matrixRoom) {
      log.silly('WechatyManager', 'onMessage() creating direct chat room from "%s"' + remoteUser.getId())
      await this.appserviceManager.createDirectRoom()
      return
    }

    await this.appserviceManager.botIntent.sendText(
      matrixRoom.getId(),
      `recv message: ${msg}`,
    )
  }

  private async onScan (
    qrcode             : string,
    status             : ScanStatus,
    matrixAdminId      : string,
  ): Promise<void> {
    require('qrcode-terminal').generate(qrcode)  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    const statusName = ScanStatus[status]

    log.verbose('WechatyManager', 'onScan(%s,%s(%s), %s)',
      qrcodeImageUrl, statusName, status, matrixAdminId)

    const matrixAdmin = await this.appserviceManager.userStore
      .getMatrixUser(matrixAdminId)
    if (!matrixAdmin) {
      throw new Error('matrix user not found for id ' + matrixAdminId)
    }

    const matrixRoom = await this.appserviceManager.directMessageRoom(matrixAdmin)

    if (!matrixRoom) {
      log.error('WechatyManager', 'onScan() direct messsage room not found for %s', matrixAdmin.getId())
      return
    }

    await this.appserviceManager.botIntent.sendText(
      matrixRoom.getId(),
      `Scan to login: ${qrcodeImageUrl}`,
    )

  }

  private async remoteUserToContact (
    remoteUser  : RemoteUser,
    matrixAdmin : MatrixUser,
  ): Promise<Contact> {
    log.verbose('WechatyManager', 'remoteUserToContact(%s, %s)',
      remoteUser.getId(),
      matrixAdmin.getId(),
    )

    const wechaty = this.wechaty(matrixAdmin.getId())
    const contactId = this.appserviceManager.remoteToContactId(remoteUser)

    if (!wechaty) {
      throw new Error('no wechaty for id ' + matrixAdmin.getId())
    }

    const contact = await wechaty.Contact.find({ id: contactId })
    if (!contact) {
      throw new Error('no contact')
    }
    return contact
  }

  private async contactToRemoteUser (
    contact     : Contact,
    matrixAdmin : MatrixUser,
  ): Promise<RemoteUser> {
    log.verbose('WechatyManager', 'contactToRemoteUser(%s, %s)',
      contact.id,
      matrixAdmin.getId(),
    )

    const remoteUserId = this.appserviceManager.contactToRemoteId(contact.id, matrixAdmin)
    let remoteUser = await this.appserviceManager.userStore.getRemoteUser(remoteUserId)

    if (!remoteUser) {
      remoteUser = new RemoteUser(remoteUserId)
      await this.appserviceManager.userStore.setRemoteUser(remoteUser)
      log.silly('WechatyManager', 'contactToRemoteUser() remote user id %s not in store. created.', remoteUserId)
    }

    let matrixGhostUserList = await this.appserviceManager.userStore.getMatrixUsersFromRemoteId(remoteUserId)
    if (matrixGhostUserList.length <= 0) {
      const ghostUserId     = this.appserviceManager.generateGhostUserId()
      const matrixGhostUser = new MatrixUser(ghostUserId)
      await this.appserviceManager.userStore.linkUsers(matrixGhostUser, remoteUser)
      log.silly('WechatyManager', 'contactToRemoteUser() remote "%s" had no linked ghost. linked to "%s".',
        remoteUserId,
        ghostUserId,
      )
    }

    return remoteUser
  }

}

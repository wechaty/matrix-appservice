import { SuperEvent } from './super-event'

import {
  log,
}           from './config'

import { AppserviceManager }  from './appservice-manager'
import { UserManager }        from './user-manager'
import { WechatyManager }     from './wechaty-manager'
import { Manager }            from './manager'

export class DialogManager extends Manager {

  // static dialogDict: Map<string, DialogManager>

  // public static dialog (
  //   matrixRoomId: string,
  // ): DialogManager {

  //   if (!this.dialogDict) {
  //     this.dialogDict = new Map<string, DialogManager>()
  //   }

  //   if (this.dialogDict.has(matrixRoomId)) {
  //     return this.dialogDict.get(matrixRoomId)!
  //   }

  //   const dialogManager = new DialogManager()
  //   this.dialogDict.set(matrixRoomId, dialogManager)
  //   return dialogManager
  // }
  public appserviceManager! : AppserviceManager
  public userManager!       : UserManager
  public wechatyManager!    : WechatyManager

  constructor () {
    super()
    log.verbose('DialogManager', 'constructor()')
  }

  public teamManager (managers: {
    appserviceManager : AppserviceManager,
    userManager       : UserManager,
    wechatyManager    : WechatyManager,
  }) {
    this.appserviceManager = managers.appserviceManager
    this.userManager       = managers.userManager
    this.wechatyManager    = managers.wechatyManager
  }

  public async gotoEnableWechatyDialog (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'gotoEnableDialog()')

    const room       = superEvent.room()
    const matrixUser = superEvent.sender()

    const intent = this.appserviceManager.bridge
      .getIntent()

    await intent.sendText(room.getId(), 'You are not enable `matrix-appservice-wechaty` yet. Please talk to the `wechaty` bot to check you in.')
    await this.userManager.enable(matrixUser)
    await intent.sendText(room.getId(), 'I had enabled it for you ;-)')
  }

  public async gotoSetupDialog (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'gotoSetupDialog()')

    const matrixUser = superEvent.sender()
    const text = superEvent.event.content!.body || ''
    log.verbose('MatrixHandler', 'gotoSetupDialog() text: "%s"', text)

    if (/^!logout$/i.test(text)) {

      log.verbose('MatrixHandler', 'gotoSetupDialog() !logout')

      const wechaty = this.wechatyManager.wechaty(matrixUser.getId())
      if (wechaty) {
        if (wechaty.logonoff()) {
          await wechaty.logout()
        }
        await wechaty.stop()
        await this.wechatyManager.destroy(wechaty)
      }

      await this.appserviceManager.sendMessage(
        'logout success.',
        superEvent.room(),
      )

    } else if (/^!login$/i.test(text)) {
      log.verbose('MatrixHandler', 'gotoSetupDialog() !login')

      let wechaty = this.wechatyManager.wechaty(matrixUser.getId())
      if (!wechaty) {
        wechaty = this.wechatyManager.create(matrixUser.getId())
        // throw new Error('no wechaty for id: ' + matrixUser.getId())
      }

      await this.appserviceManager.sendMessage(
        'Starting Wechaty Bridge...',
        superEvent.room(),
      )

      await wechaty.start()

      await this.appserviceManager.sendMessage(
        'Wechaty Bridge started.',
        superEvent.room(),
      )

    } else {
      const help = [
        'Avaiable commands: !login, !logout',
      ].join('')

      await this.appserviceManager.sendMessage(
        help,
        superEvent.room(),
      )
    }
  }

  // private gotoLoginWechatyDialog (matrixUserId: string): void {
  //   log.verbose('MatrixHandler', 'gotoLoginWechatDialog(%s)', matrixUserId)
  // }

}

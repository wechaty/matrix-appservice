import { SuperEvent } from './super-event'

import {
  log,
}           from './config'

import { AppserviceManager } from './appservice-manager'
import { WechatyManager } from './wechaty-manager'

export class DialogManager {

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

  constructor (
    public appserviceManager: AppserviceManager,
    public wechatyManager: WechatyManager,
  ) {
    log.verbose('DialogManager', 'constructor()')
  }

  public async gotoEnableWechatyDialog (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'gotoEnableDialog()')

    // const userPair = await superEvent.directMessageUserPair()
    const room = superEvent.room()
    const matrixUser = superEvent.sender()

    // console.info('DEBUG userPair', userPair)

    // const matrixUserList = await this.appserviceManager.userStore
    //   .getMatrixUsersFromRemoteId(userPair.remote.getId())

    // if (matrixUserList.length !== 1) {
    //   throw new Error(`get ${matrixUserList.length} matrix user from remote user id ${userPair.remote.getId()}`)
    // }

    // const matrixUser = matrixUserList[0]

    const intent = this.appserviceManager.bridge
      .getIntent()

    await intent.sendText(room.getId(), 'You are not enable `matrix-appservice-wechaty` yet. Please talk to the `wechaty` bot to check you in.')
    await this.appserviceManager.enable(matrixUser)
    await intent.sendText(room.getId(), 'I had enabled it for you ;-)')
  }

  public async gotoSetupDialog (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'gotoSetupDialog()')

    const matrixUser = superEvent.sender()

    let wechaty = this.wechatyManager.wechaty(matrixUser.getId())
    if (!wechaty) {
      wechaty = this.wechatyManager.create(matrixUser.getId())
      await wechaty.start()
      // throw new Error('no wechaty for id: ' + matrixUser.getId())
    }

    // message to wechaty ghost users
    if (!wechaty.logonoff()) {
      await this.gotoLoginWechatyDialog(matrixUser.getId())
    } else {
    }
  }

  private gotoLoginWechatyDialog (matrixUserId: string): void {
    log.verbose('MatrixHandler', 'gotoLoginWechatDialog(%s)', matrixUserId)
  }

}

import {
  BridgeContext,
  Request,
  MatrixUser,
  ProvisionedUser,
}                   from 'matrix-appservice-bridge'

import {
  AGE_LIMIT_SECONDS,
  APPSERVICE_USER_DATA_KEY,

  AppserviceMatrixUserData,

  log,
}                     from './config'

import { AppserviceManager }  from './appservice-manager'
import { SuperEvent }         from './super-event'
import { WechatyManager }     from './wechaty-manager'
import { DialogManager } from './dialog-manager'

export class MatrixHandler {

  public appserviceManager! : AppserviceManager
  public wechatyManager!    : WechatyManager

  constructor (
    public dialogManager: DialogManager,
  ) {
    log.verbose('MatrixHandler', 'constructor()')
  }

  public setManager (
    appserviceManager : AppserviceManager,
    wechatyManager    : WechatyManager,
  ): void {
    this.appserviceManager = appserviceManager
    this.wechatyManager    = wechatyManager
  }

  public async onEvent (
    request : Request,
    context : BridgeContext,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'onEvent({type: "%s"}, {userId: "%s"})',
      request.data.type,
      context.senders.matrix.getId(),
    )
    // log.silly('MatrixHandler', 'onEvent("%s", "%s")',
    //   JSON.stringify(request),
    //   JSON.stringify(context),
    // )
    // console.info('request', request)
    // console.info('context', context)

    const superEvent = new SuperEvent(
      request,
      context,
      this.appserviceManager,
      this.wechatyManager,
    )

    /**
     * Put all the logical to processEvent()
     * because we need to add a try {} wrapper to all the codes
     * to prevent un-catched rejection.
     */

    try {

      await this.process(superEvent)

    } catch (e) {
      log.error('MatrixHandler', 'onEvent() rejection: %s', e && e.message)
      console.error(e)
    }
  }

  /**
   * Be aware that the queriedUser did not contains any data from userStore.
   */
  public async onUserQuery (
    queriedUser: MatrixUser,
  ): Promise<ProvisionedUser> {
    log.verbose('MatrixHandler', 'onUserQuery("%s")', JSON.stringify(queriedUser),
      APPSERVICE_USER_DATA_KEY as any as AppserviceMatrixUserData)
    return {}
    // const storeMatrixUser = await this.appserviceManager.matrixUser(queriedUser.getId())
    // const userData = {
    //   ...storeMatrixUser.get(
    //     APPSERVICE_USER_DATA_KEY
    //   ),
    // } as AppserviceMatrixUserData

    // const provisionedUser = {
    //   name : userData.name,
    //   url  : userData.avatar,
    // } as ProvisionedUser

    // log.silly('MatrixHandler', 'onUserQuery() -> "%s"', JSON.stringify(provisionedUser))
    // return provisionedUser
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  protected async process (
    superEvent : SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'process(superEvent)')

    if (superEvent.isRoomInvitation()) {
      if (superEvent.isBotTarget()) {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() appservice was invited')
        await this.processRoomInvitationToBot(superEvent)
      } else {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() skipped for non-bot user: %s"', superEvent.target()!.getId())
      }
      return
    }

    switch (superEvent.type()) {

      case 'm.room.message':
        await this.processMatrixMessage(superEvent)
        break

      default:
        log.silly('MatrixHandler', 'process() default for type: ' + superEvent.type())
        console.info('DEBUG request', superEvent.request)
        console.info('DEBUG context', superEvent.context)
        break

    }

  }

  protected async processRoomInvitationToBot (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processRoomInvitationToBot()')

    await superEvent.acceptRoomInvitation()

    const room   = superEvent.room()
    const sender = superEvent.sender()

    const memberIdDict = await this.appserviceManager.bridge.getBot()
      .getJoinedMembers(room.getId())

    const memberNum = Object.keys(memberIdDict).length

    if (memberNum === 2) {
      log.silly('MatrixHandler', 'process() room has 2 members, treat it as a direct room')

      await this.appserviceManager.directMessageRoom(sender, room)

      const text = 'This room has been registered as your bridge management/status room.'
      await this.appserviceManager.directMessage(room, text)

    } else {
      log.silly('MatrixHandler', 'process() room has %s(!=2) members, it is not a direct room', memberNum)
    }
  }

  protected async processMatrixMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processMatrixRoomMessage(superEvent)')

    /**
     * Matrix age was converted from millisecond to seconds in SuperEvent
     */
    if (superEvent.age() > AGE_LIMIT_SECONDS) {
      log.verbose('MatrixHandler', 'processMatrixMessage() skipping event due to age %s > %s',
        superEvent.age(), AGE_LIMIT_SECONDS)
      return
    }

    if (superEvent.isBotSender() || superEvent.isVirtualSender()) {
      log.verbose('MatrixHandler', 'processMatrixMessage() virtual or appservice sender "%s" found, skipped.',
        superEvent.sender().getId())
      return
    }

    const matrixUser = superEvent.sender()
    const matrixRoom = superEvent.room()

    // console.info('DEBUG: matrixUser', matrixUser)
    // console.info('DEBUG: matrixUser.getId()', matrixUser.getId())
    // console.info('DEBUG: matrixUser.userId', (matrixUser as any).userId)
    // console.info('DEBUG: matrixRoom', matrixRoom)

    try {
      const filehelper = await this.wechatyManager
        .filehelperOf(matrixUser.getId())

      if (filehelper) {
        await filehelper.say(`Matrix user "${matrixUser.getId()}" in room "${matrixRoom.getId()}" said: "${superEvent.event.content!.body}"`)
      }
    } catch (e) {
      log.warn('MatrixHandler', 'processMatrixMessage() filehelperOf() rejection: %s', e.message)
    }

    if (await superEvent.isDirectMessage()) {
      await this.processDirectMessage(superEvent)
    } else {
      await this.processGroupMessage(superEvent)
    }

  }

  protected async processDirectMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processDirectMessage()')

    const { user, service } = await superEvent.directMessageUserPair()
    const wechatyEnabled    = await this.appserviceManager.isEnabled(user)

    if (!wechatyEnabled) {
      await this.dialogManager.gotoEnableWechatyDialog(superEvent)
      return
    }

    /**
     * Enabled
     */

    if (this.appserviceManager.isBot(service.getId())) {

      await this.dialogManager.gotoSetupDialog(superEvent)

    } else if (this.appserviceManager.isVirtual(service.getId())) {

      await this.bridgeToWechatIndividual(superEvent)

    } else {
      throw new Error('unknown service id ' + service.getId())
    }

  }

  protected async processGroupMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processGroupMessage()')

    const matrixUser = superEvent.sender()

    const isEnabled = this.appserviceManager.isEnabled(matrixUser)

    if (!isEnabled) {
      log.silly('MatrixHandler', 'processRoomMessage() %s is not enabled for wechaty', matrixUser.getId())
      let directMessageRoom = await this.appserviceManager.directMessageRoom(matrixUser)
      if (!directMessageRoom) {
        directMessageRoom = await this.appserviceManager.createDirectRoom(matrixUser)
      }
      await this.appserviceManager.directMessage(
        directMessageRoom,
        'You did not enable wechaty appservice yet. please contact huan.',
      )
      // TODO: add action
      return
    }

    try {
      const wechatyRoom = await this.wechatyManager.wechatyRoom(
        superEvent.room(),
        superEvent.sender(),    // FIXME: should be consumer
      )

      await wechatyRoom.say(superEvent.event.content!.body || 'undefined')

    } catch (e) {
      log.silly('MatrixHandler', 'onGroupMessage() rejection: %s', e.message)

      // FIXME: better way to deal with this error message
      let dmRoom = await this.appserviceManager.directMessageRoom(superEvent.sender())
      if (!dmRoom) {
        dmRoom = await this.appserviceManager.createDirectRoom(superEvent.sender())
      }
      await this.appserviceManager.directMessage(dmRoom, e.message)

    }
  }

  protected async bridgeToWechatIndividual (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'bridgeToWechatIndividual()')

    const { user, service } = await superEvent.directMessageUserPair()

    const contact = await this.wechatyManager
      .wechatyContact(service, user)
    const text = superEvent.event.content!.body
    await contact.say(text + '')
  }

}

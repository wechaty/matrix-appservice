import {
  BridgeContext,
  Request,
  MatrixUser,
  ProvisionedUser,
}                   from 'matrix-appservice-bridge'

import {
  AGE_LIMIT_SECONDS,

  log,
}                     from './config'

import { SuperEvent }         from './super-event'

import { AppserviceManager }  from './appservice-manager'
import { DialogManager }      from './dialog-manager'
import { MiddleManager }      from './middle-manager'
import { WechatyManager }     from './wechaty-manager'
import { UserManager }        from './user-manager'

export class MatrixHandler {

  public appserviceManager! : AppserviceManager
  public userManager!       : UserManager
  public wechatyManager!    : WechatyManager
  public middleManager!        : MiddleManager
  public dialogManager!     : DialogManager

  constructor () {
    log.verbose('MatrixHandler', 'constructor()')
  }

  public setManager (managers: {
    appserviceManager : AppserviceManager,
    dialogManager     : DialogManager,
    userManager       : UserManager,
    middleManager     : MiddleManager,
    wechatyManager    : WechatyManager,
  }): void {
    this.appserviceManager = managers.appserviceManager
    this.dialogManager     = managers.dialogManager
    this.userManager       = managers.userManager
    this.middleManager     = managers.middleManager
    this.wechatyManager    = managers.wechatyManager
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

      console.info('[event.request]:', request)
      console.info('[event.context]:', context)

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
    log.verbose('MatrixHandler', 'onUserQuery("%s")', JSON.stringify(queriedUser))

    // FIXME:
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
    log.verbose('MatrixHandler', 'process({type: %s})', superEvent.type())

    if (superEvent.isRoomInvitation()) {
      if (superEvent.targetIsBot()) {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() appservice was invited')
        await this.processRoomInvitationForBot(superEvent)
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
        // console.info('DEBUG request', superEvent.request)
        // console.info('DEBUG context', superEvent.context)
        break

    }

  }

  protected async processRoomInvitationForBot (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processRoomInvitationForBot()')

    await superEvent.acceptRoomInvitation()

    const room   = superEvent.room()
    const sender = superEvent.sender()

    const memberIdDict = await this.appserviceManager.bridge
      .getBot()
      .getJoinedMembers(room.getId())

    const memberNum = Object.keys(memberIdDict).length

    if (memberNum === 2) {
      log.silly('MatrixHandler', 'process() room has 2 members, treat it as a direct room')

      await this.middleManager.setDirectMessageRoom({
        consumer   : sender,
        matrixRoom : room,
        matrixUser : superEvent.target()!,
      })

      const text = 'This room has been registered as your bridge management/status room.'
      await this.appserviceManager.sendMessage(
        text,
        room,
      )

    } else {
      log.silly('MatrixHandler', 'process() room has %s(!=2) members, it is not a direct room', memberNum)
    }
  }

  protected async processMatrixMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processMatrixMessage(superEvent)')

    /**
     * Matrix age was converted from millisecond to seconds in SuperEvent
     */
    if (superEvent.age() > AGE_LIMIT_SECONDS) {
      log.verbose('MatrixHandler', 'processMatrixMessage() skipping event due to age %s > %s',
        superEvent.age(), AGE_LIMIT_SECONDS)
      return
    }

    if (superEvent.senderIsBot() || superEvent.senderIsVirtual()) {
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

    const room = superEvent.room()

    if (await this.middleManager.isDirectMessageRoom(room)) {
      await this.processDirectMessage(superEvent)
    } else {
      await this.processGroupMessage(superEvent)
    }

  }

  protected async processDirectMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processDirectMessage()')

    const room = superEvent.room()
    const { user, service } = await this.middleManager.directMessageUserPair(room)

    const wechatyEnabled    = await this.userManager.isEnabled(user)

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

    const isEnabled = this.userManager.isEnabled(matrixUser)

    if (!isEnabled) {
      await this.dialogManager.gotoEnableWechatyDialog(superEvent)
      return
    }

    try {
      const wechatyRoom = await this.middleManager.wechatyRoom(superEvent.room())
      // await this.wechatyManager.wechatyRoom(
      //   superEvent.room(),
      //   superEvent.sender(),    // FIXME: should be consumer
      // )

      await wechatyRoom.say(superEvent.event.content!.body || 'undefined')

    } catch (e) {
      log.error('MatrixHandler', 'processGroupMessage() rejection: %s', e.message)
      // const wechatyRoom = await this.middleManager.wechatyUser(superEvent.)
      // await wechatyRoom.say(superEvent.event.content!.body || 'undefined')
    }
  }

  protected async bridgeToWechatIndividual (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'bridgeToWechatIndividual()')

    const room = superEvent.room()
    const { service } = await this.middleManager.directMessageUserPair(room)

    const contact = await this.middleManager.wechatyUser(service)
    // const contact = await this.wechatyManager
    //   .wechatyContact(service, user)

    const text = superEvent.event.content!.body
    await contact.say(text + '')
  }

}

import {
  BridgeContext,
  Request,
  // RemoteUser,
}                   from 'matrix-appservice-bridge'

import {
  AGE_LIMIT as AGE_LIMIT_SECONDS,
  log,
}                     from './config'

import { AppserviceManager }  from './appservice-manager'
import { SuperEvent }         from './super-event'
import { WechatyManager }     from './wechaty-manager'

export class MatrixHandler {

  public appserviceManager! : AppserviceManager
  public wechatyManager!    : WechatyManager

  constructor () {
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
   * Invoked when the bridge receives a user query from the homeserver. Supports
   * both sync return values and async return values via promises.
   * @callback Bridge~onUserQuery
   * @param {MatrixUser} matrixUser The matrix user queried. Use <code>getId()</code>
   * to get the user ID.
   * @return {?Bridge~ProvisionedUser|Promise<Bridge~ProvisionedUser, Error>}
   * Reject the promise / return null to not provision the user. Resolve the
   * promise / return a {@link Bridge~ProvisionedUser} object to provision the user.
   * @example
   * new Bridge({
   *   controller: {
   *     onUserQuery: function(matrixUser) {
   *       var remoteUser = new RemoteUser("some_remote_id");
   *       return {
   *         name: matrixUser.localpart + " (Bridged)",
   *         url: "http://someurl.com/pic.jpg",
   *         user: remoteUser
   *       };
   *     }
   *   }
   * });
   */
  public async onUserQuery (
    queriedUser: any,
  ): Promise<object> {
    log.verbose('MatrixHandler', 'onUserQuery("%s")', JSON.stringify(queriedUser))
    console.info('queriedUser', queriedUser)

    // if (isBridgeUser(matrixUserId)) {
    //   const wechaty = this.wechatyManager!.get(matrixUserId)
    //   const bridgeUser = new BridgeUser(matrixUserId, this.bridge!, wechaty)

    //   onBridgeUserUserQuery.call(bridgeUser, queriedUser)
    //     .catch(e => {
    //       log.error('AppServiceManager', 'onUserQuery() onBridgeUserUserQuery() rejection: %s', e && e.message)
    //     })
    // try {
    //   const provision = await onUserQuery.call(this, queriedUser)
    //   return provision
    // } catch (e) {
    //   log.error('AppServiceManager', 'onUserQuery() rejection: %s', e && e.message)
    // }

    // auto-provision users with no additonal data
    return {}
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  private async process (
    superEvent : SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'process(superEvent)')

    /**
     * Matrix age is millisecond, convert second by multiple 1000
     */
    if (superEvent.age() > AGE_LIMIT_SECONDS * 1000) {
      log.verbose('MatrixHandler', 'process() skipping event due to age %s > %s',
        superEvent.age(), AGE_LIMIT_SECONDS * 1000)
      return
    }

    if (superEvent.isBotSender() || superEvent.isGhostSender()) {
      log.verbose('MatrixHandler', 'process() ghost or appservice sender "%s" found, skipped.', superEvent.sender().getId())
      return
    }

    if (superEvent.isRoomInvitation()) {
      if (superEvent.isBotTarget()) {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() appservice accepted')
        await superEvent.acceptRoomInvitation()

        const room   = superEvent.room()
        const sender = superEvent.sender()

        const memberIdDict = await this.appserviceManager.bridge.getBot()
          .getJoinedMembers(room.getId())

        const memberNum = Object.keys(memberIdDict).length

        if (memberNum === 2) {
          log.silly('MatrixHandler', 'process() room has 2 members, treat it as a direct room')
          const directMessageRoom = await this.appserviceManager.directMessageRoom(sender)

          if (!directMessageRoom) {
            await this.appserviceManager.directMessageRoom(sender, room)
          }
        } else {
          log.silly('MatrixHandler', 'process() room has %s(!=2) members, it is not a direct room', memberNum)
        }

      } else {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() skipped for non-bot user: %s"', superEvent.target()!.getId())
      }
      return
    }

    switch (superEvent.type()) {

      case 'm.room.message':
        await this.processMatrixRoomMessage(superEvent)
        break

      default:
        log.silly('MatrixHandler', 'process() default for type: ' + superEvent.type())
        console.info('DEBUG request', superEvent.request)
        console.info('DEBUG context', superEvent.context)
        break

    }

  }

  private async processMatrixRoomMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processMatrixRoomMessage(superEvent)')

    const matrixUser = superEvent.sender()
    const matrixRoom = superEvent.room()

    console.info('DEBUG: matrixUser', matrixUser)
    // console.info('DEBUG: matrixUser.getId()', matrixUser.getId())
    // console.info('DEBUG: matrixUser.userId', (matrixUser as any).userId)
    console.info('DEBUG: matrixRoom', matrixRoom)

    const wechaty = await this.wechatyManager.wechaty(matrixUser.getId())

    if (wechaty) {

      if (wechaty.logonoff()) {
        const filehelper = await wechaty.Contact.find('filehelper')
        if (filehelper) {
          await filehelper.say(`Matrix user ${matrixUser.getId()} in room ${matrixRoom.getId()} said: ${superEvent.event.content}`)
        } else {
          log.error('MatrixHandler', 'processMatrixRoomMessage() filehelper not found from wechaty')
        }
      } else {
        log.silly('MatrixHandler', 'processMatrixRoomMessage() wechaty not logined for user id: %s', matrixUser.getId())
      }

    } else {
      log.silly('MatrixHandler', 'processMatrixRoomMessage() no wechaty for user id: %s', matrixUser.getId())
    }

    const remoteRoom = superEvent.remoteRoom()
    if (remoteRoom) {
      return this.forwardToRemoteRoom(superEvent)
    }

    if (await superEvent.isDirectMessage()) {
      await this.processDirectMessage(superEvent)
    } else {
      await this.processGroupMessage(superEvent)
    }

  }

  private async forwardToRemoteRoom (
    superEvent: SuperEvent,
  ): Promise<void> {

    // FIXME: not right here

    const wechatyRoomId = superEvent.remoteRoom()!.getId()
    const matrixUserId = superEvent.sender().getId()
    const wechaty = this.wechatyManager.wechaty(matrixUserId)

    if (!wechaty) {
      throw new Error('can not found wechaty for matrix user id ' + matrixUserId)
    }

    const room = await wechaty.Room.find({ id: wechatyRoomId })

    if (!room) {
      throw new Error('can not found wechaty room for room id: ' + wechatyRoomId)
    }

    const text = superEvent.event.content!.body

    if (!text) {
      throw new Error('no text')
    }

    await room.say(text)
  }

  private async processDirectMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processDirectMessage()')

    const { user, service }       = await superEvent.directMessageUserPair()
    const wechatyEnabled = await this.appserviceManager.isEnabled(user)

    if (!wechatyEnabled) {
      await this.gotoEnableWechatyDialog(superEvent)
      return
    }

    /**
     * Enabled
     */

    if (this.appserviceManager.isBot(service.getId())) {

      await this.gotoSetupDialog(superEvent)

    } else if (this.appserviceManager.isGhost(service.getId())) {

      await this.bridgeToWechatIndividual(superEvent)

    } else {
      throw new Error('unknown service id ' + service.getId())
    }

  }

  private async processGroupMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processGroupMessage()')

    const matrixUser = superEvent.sender()

    const isEnabled = this.appserviceManager.isEnabled(matrixUser)

    if (!isEnabled) {
      log.silly('MatrixHandler', 'processRoomMessage() %s is not enabled for wechaty', matrixUser.getId())
      // TODO: add action
      return
    }

    try {
      const roomPair = await superEvent.roomPair()
      if (!roomPair) {
        throw new Error('no room pair for super event')
      }

      const wechaty = this.wechatyManager.wechaty(matrixUser.getId())
      if (!wechaty) {
        throw new Error('no wechaty')
      }

      const wechatyRoom = await wechaty.Room.find({ id: roomPair.remote.getId() })
      if (!wechatyRoom) {
        throw new Error('no wechaty room for id: ' + roomPair.remote.getId())
      }

      await wechatyRoom.say(superEvent.event.content!.body!)

    } catch (e) {
      log.silly('MatrixHandler', 'onGroupMessage() roomPair() rejection: %s', e.message)
    }
  }

  private async gotoEnableWechatyDialog (
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

  private async gotoSetupDialog (
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

  private async bridgeToWechatIndividual (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'bridgeToWechatIndividual(%s, %s, %s)', superEvent.sender().getId())

    const { user, service } = await superEvent.directMessageUserPair()

    const remoteUserList = await this.appserviceManager.userStore.getRemoteUsersFromMatrixId(service.getId())
    if (remoteUserList.length === 0) {
      throw new Error('no remote in store for service id ' + service.getId())
    }
    const remoteUser = remoteUserList[0]

    const wechaty = this.wechatyManager.wechaty(user.getId())
    if (!wechaty) {
      throw new Error('no wechaty for matrix user id ' + user.getId())
    }

    const contactId = this.appserviceManager.remoteToContactId(remoteUser)

    const contact = await wechaty.Contact.find({ id: contactId })
    if (!contact) {
      throw new Error('no contact for id ' + contactId)
    }
    const text = superEvent.event.content!.body
    await contact.say(text + '')
  }

  // private async bridgeToWechatyRoom (args: {
  //   matrixRoom : MatrixRoom,
  //   remoteRoom : RemoteRoom,
  //   text       : string,
  //   toGhostId  : string,
  // }): Promise<void> {
  //   log.verbose('MatrixHandler', 'bridgeToWechatyRoom(%s, %sgetId(),
  //     args.matrixRoom.roomId, args.text)

  //   const wechatyRoomId = args.remoteRoom.get('roomId') as undefined | string

  //   if (!wechatyRoomId) {
  //     throw new Error('no room id')
  //   }

  //   console.info('TODO: brige to wechaty room')

  //   // try {
  //   //   const room = this.wechaty.Room.load(wechatyRoomId)
  //   //   await room.say(`${args.toGhostId} -> ${args.text}`)

  //   // } catch (e) {
  //   //   const errMsg = `no wechaty room found for id: ${wechatyRoomId}`
  //   //   log.warn('MatrixHandler', 'matrix-handlers on-0event-room-message bridgeToWechatyRoom() %s',
  //   //     errMsg)
  //   //   await this.matrixBotIntent.sendText(this.matrixDirectMessageRoomID, errMsg)
  //   // }

  // }

  // private async isKnownRoom (
  //   superEvent: SuperEvent,
  // ): Promise<boolean> {
  //   log.verbose('MatrixHandler', 'isKnownRoom()')

  //   const roomStore = await this.appserviceManager.bridge.getRoomStore()
  //   if (!roomStore) {
  //     throw new Error('no room store')
  //   }
  //   const matrixRoomId = superEvent.room().roomId
  //   const entrieList = roomStore.getEntriesByMatrixId(matrixRoomId)
  //   if (entrieList.length >= 0) {
  //     return true
  //   }
  //   return false
  // }

  /*
  { age: 43,
    content: { body: 'b', msgtype: 'm.text' },
    event_id: '$156165443741OCgSZ:aka.cn',
    origin_server_ts: 1561654437732,
    room_id: '!iMkbIwAOkbvCQbRoMm:aka.cn',
    sender: '@huan:aka.cn',
    type: 'm.room.message',
    unsigned: { age: 43 },
    user_id: '@huan:aka.cn' }
  */
  // private async replyUnknownRoom (
  //   superEvent: SuperEvent,
  // ): Promise<void> {
  //   log.verbose('MatrixHandler', 'replyUnnownRoom()')

  //   // const client = bridge.getClientFactory().getClientAs()
  //   // console.info('peeking')
  //   // await client.peekInRoom(event.room_id)

  //   // console.info('peeked')

  //   // const room = client.getRoom(event.room_id)
  //   // if (!room) {
  //   //   throw new Error('no room')
  //   // }
  //   // const dmInviter = room.getDMInviter()
  //   // console.info('dminviter', dmInviter)

  //   const memberDict = await this.appserviceManager.bridge.getBot().getJoinedMembers(superEvent.room().roomId)

  //   const wechatyGhostIdList = Object.keys(memberDict)
  //     .filter(id => this.appserviceManager.bridge.getBot().isRemoteUser(id))

  //   if (wechatyGhostIdList.length <= 0) {
  //     throw new Error('no wechaty ghost in the room')
  //   }

  //   const ghostId = wechatyGhostIdList[0]
  //   console.info('ghostId', ghostId)

  //   // for (const member of memberList) {
  //   //   console.info('member', member)
  //   //   console.info('member id', member.userId)
  //   // }

  //   const intent = this.appserviceManager.bridge.getIntent(ghostId)
  //   await intent.sendText(superEvent.room().roomId, 'replyUnknownRoom: ' + superEvent.event.content!.body)
  // }

}

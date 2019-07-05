import {
  BridgeContext,
  Request,
  MatrixRoom,
  RemoteRoom,
}                   from 'matrix-appservice-bridge'

import {
  AGE_LIMIT,
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
      context.senders.matrix.userId,
    )
    log.silly('MatrixHandler', 'onEvent("%s", "%s")',
      JSON.stringify(request),
      JSON.stringify(context),
    )

    const superEvent = new SuperEvent(
      request,
      context,
      this.appserviceManager.bridge,
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

  public async onUserQuery (
    queriedUser: any,
  ): Promise<object> {
    log.verbose('MatrixHandler', 'onUserQuery("%s")', JSON.stringify(queriedUser))

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
    log.verbose('MatrixHandler', 'processEvent(superEvent)')

    /**
     * Matrix age is millisecond, convert second by multiple 1000
     */
    if (superEvent.age() > AGE_LIMIT * 1000) {
      log.verbose('MatrixHandler', 'process() skipping event due to age %s > %s',
        superEvent.age(), AGE_LIMIT * 1000)
      return
    }

    if (superEvent.isRemoteSender()) {
      log.verbose('MatrixHandler', 'process() isRemoteUser(%s) is true, skipped', superEvent.sender().userId)
      return
    }

    if (superEvent.isRoomInvitation()) {
      if (superEvent.isBotTarget()) {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() bot accepted')
        await superEvent.acceptRoomInvitation()
      } else {
        log.verbose('MatrixHandler', 'process() isRoomInvitation() skipped for non-bot user: %s"', superEvent.target()!.userId)
      }
      return
    }

    switch (superEvent.type()) {

      case 'm.room.message':
        await this.processRoomMessage(superEvent)
        break

      default:
        log.silly('MatrixHandler', 'process() default for type: ' + superEvent.type())
        break

    }

  }

  private async processRoomMessage (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processRoomMessage(superEvent)')

    const matrixUser = superEvent.sender()
    const matrixRoom = superEvent.room()

    const isEnabled = this.appserviceManager.isEnabled(matrixUser)

    if (!isEnabled) {
      log.silly('MatrixHandler', 'processRoomMessage() %s is not enabled for wechaty', matrixUser.userId)
      return
    }

    const wechaty = await this.wechatyManager.wechaty(matrixUser.userId)

    if (!wechaty) {
      log.silly('MatrixHandler', 'processRoomMessage() wechaty not found for user id: ', matrixUser.userId)
      return
    }

    const filehelper = await wechaty.Contact.find('filehelper')
    if (filehelper) {
      await filehelper.say(`Matrix user ${matrixUser.userId} in room ${matrixRoom.roomId} said: ${superEvent.event.content}`)
    } else {
      log.error('MatrixHandler', 'processRoomMessage() filehelper not found from wechaty')
    }

    if (!await this.isKnownRoom(superEvent)) {
      await this.replyUnknownRoom(superEvent)
      return
    }

    const contentBody = superEvent.event.content!.body
    const roomId      = matrixRoom.roomId
    const senderId    = superEvent.sender().userId
    const userId      = matrixUser.userId

    if (superEvent.isDirectRoom()) {
      await this.processDirectMessage({
        matrixUserId : senderId,
        matrixRoomId : roomId,
        toGhostId    : userId,
        text         : contentBody || '',
      })
    } else {
      await this.processGroupMessage({
        matrixRoomId : roomId,
        matrixUserId : senderId,
        toGhostId    : userId,
        text         : contentBody || '',
      })
    }

    // if (sendFromRemoteUser()) {
    //   return
    // }

    // if (linkedRoom()) {
    //   forwardMessage()
    //   return
    // }

    // if (isDirect()) {
    //   if (enabledWechaty()) {
    //     setupDialog()
    //   } else {
    //     enableDialog()
    //   }
    //   return
    // }

    // // Group, not direct
    // log.warn()
    // return

  }

  private async processDirectMessage (args: {
    matrixUserId : string,
    matrixRoomId : string,
    toGhostId    : string,
    text         : string,
  }): Promise<void> {
    log.verbose('MatrixHandler', 'processDirectMessage()')

    // FIXME: here is always enabled.
    // move the enable wechaty dialog code to upper

    const matrixUser = await this.appserviceManager.userStore.getMatrixUser(args.matrixUserId)
    if (!matrixUser) {
      throw new Error('can not get matrix user from store for id: ' + args.matrixUserId)
    }

    const wechatyEnabled = await this.appserviceManager.isEnabled(matrixUser)

    if (this.appserviceManager.bridge.getBot().isRemoteUser(args.toGhostId)) {
      if (wechatyEnabled) {
        await this.gotoSetupDialog(args.matrixUserId)
      } else {
        await this.gotoEnableWechatyDialog(args.matrixUserId, args.text)
      }
      return
    }

    if (!wechatyEnabled) {
      const intent = this.appserviceManager.bridge.getIntent(args.toGhostId)
      await intent.sendText(args.matrixRoomId, 'You are not enable `matrix-appservice-wechaty` yet. Please talk to the `wechaty` bot to check you in.')
      return
    }

    const wechaty = this.wechatyManager.wechaty(args.matrixUserId)
    if (!wechaty) {
      throw new Error('no wechaty for id: ' + args.matrixUserId)
    }

    // message to wechaty ghost users
    if (!wechaty.logonoff()) {
      await this.gotoLoginWechatyDialog(args.matrixUserId)
    } else {
      await this.bridgeToWechatIndividual(args.matrixUserId, args.toGhostId, args.text)
    }

  }

  private async processGroupMessage (args: {
    matrixRoomId : string,
    matrixUserId : string,
    text         : string,
    toGhostId    : string,
  }): Promise<void> {
    log.verbose('MatrixHandler', 'processGroupMessage()')

    const { matrixRoom, remoteRoom } = await this.getRoomPair(args.matrixRoomId)

    if (remoteRoom) {

      await this.bridgeToWechatyRoom({
        matrixRoom,
        remoteRoom,
        text: args.text,
        toGhostId: args.toGhostId,
      })

    } else {
      log.silly('MatrixHandler', 'onGroupMessage(%s) did not match any wechat room', args.matrixRoomId)
    }

    console.info('TODO: ', args.matrixUserId, args.matrixRoomId, args.text)
  }

  private gotoEnableWechatyDialog (
    matrixUserId: string,
    text: string,
  ): void {
    log.verbose('MatrixHandler', 'gotoEnableDialog(%s, %s)', matrixUserId, text)
  }

  private gotoSetupDialog (matrixUserId: string): void {
    log.verbose('MatrixHandler', 'gotoSetupDialog(%s)', matrixUserId)

  }

  private gotoLoginWechatyDialog (matrixUserId: string): void {
    log.verbose('MatrixHandler', 'gotoLoginWechatDialog(%s)', matrixUserId)

  }

  private async bridgeToWechatIndividual (
    matrixUserId: string,
    toGhostId: string,
    text: string,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'bridgeToWechatIndividual(%s, %s, %s)', matrixUserId, toGhostId, text)
  }

  private async getRoomPair (
    matrixRoomId: string,
  ): Promise<{
    matrixRoom: MatrixRoom,
    remoteRoom: RemoteRoom,
  }> {
    log.verbose('MatrixHandler', 'hasLinkedWechatyRoom(%s)', matrixRoomId)

    const roomStore = this.appserviceManager.bridge.getRoomStore()

    if (!roomStore) {
      log.verbose('MatrixHandler', 'hasLinkedWechatyRoom() no room store')
      throw new Error('no room store')
    }

    const entryList = roomStore.getEntriesByMatrixId(matrixRoomId)
    if (entryList.length <= 0) {
      throw new Error('no entry found')
    }

    const matrixRoom = entryList[0].matrix
    const remoteRoom = entryList[0].remote

    if (!matrixRoom || !remoteRoom) {
      throw new Error('room not found!')
    }

    return {
      matrixRoom,
      remoteRoom,
    }
  }

  private async bridgeToWechatyRoom (args: {
    matrixRoom : MatrixRoom,
    remoteRoom : RemoteRoom,
    text       : string,
    toGhostId  : string,
  }): Promise<void> {
    log.verbose('MatrixHandler', 'bridgeToWechatyRoom(%s, %s)',
      args.matrixRoom.roomId, args.text)

    const wechatyRoomId = args.remoteRoom.get('roomId') as undefined | string

    if (!wechatyRoomId) {
      throw new Error('no room id')
    }

    console.info('TODO: brige to wechaty room')

    // try {
    //   const room = this.wechaty.Room.load(wechatyRoomId)
    //   await room.say(`${args.toGhostId} -> ${args.text}`)

    // } catch (e) {
    //   const errMsg = `no wechaty room found for id: ${wechatyRoomId}`
    //   log.warn('MatrixHandler', 'matrix-handlers on-0event-room-message bridgeToWechatyRoom() %s',
    //     errMsg)
    //   await this.matrixBotIntent.sendText(this.matrixDirectMessageRoomID, errMsg)
    // }

  }

  private async isKnownRoom (
    superEvent: SuperEvent,
  ): Promise<boolean> {
    log.verbose('MatrixHandler', 'isKnownRoom()')

    const roomStore = await this.appserviceManager.bridge.getRoomStore()
    if (!roomStore) {
      throw new Error('no room store')
    }
    const matrixRoomId = superEvent.room().roomId
    const entrieList = roomStore.getEntriesByMatrixId(matrixRoomId)
    if (entrieList.length >= 0) {
      return true
    }
    return false
  }

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
  private async replyUnknownRoom (
    superEvent: SuperEvent,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'replyUnnownRoom()')

    // const client = bridge.getClientFactory().getClientAs()
    // console.info('peeking')
    // await client.peekInRoom(event.room_id)

    // console.info('peeked')

    // const room = client.getRoom(event.room_id)
    // if (!room) {
    //   throw new Error('no room')
    // }
    // const dmInviter = room.getDMInviter()
    // console.info('dminviter', dmInviter)

    const memberDict = await this.appserviceManager.bridge.getBot().getJoinedMembers(superEvent.room().roomId)

    const wechatyGhostIdList = Object.keys(memberDict)
      .filter(id => this.appserviceManager.bridge.getBot().isRemoteUser(id))

    if (wechatyGhostIdList.length <= 0) {
      throw new Error('no wechaty ghost in the room')
    }

    const ghostId = wechatyGhostIdList[0]
    console.info('ghostId', ghostId)

    // for (const member of memberList) {
    //   console.info('member', member)
    //   console.info('member id', member.userId)
    // }

    const intent = this.appserviceManager.bridge.getIntent(ghostId)
    await intent.sendText(superEvent.room().roomId, 'replyUnknownRoom: ' + superEvent.event.content!.body)
  }

}

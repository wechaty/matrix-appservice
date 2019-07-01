import {
  BridgeContext,
  Event,
  Request,
  MatrixRoom,
  RemoteRoom,
}                   from 'matrix-appservice-bridge'

import { log } from './config'

import { WechatyManager } from './wechaty-manager'
import { AppserviceManager } from './appservice-manager'

const AGE_LIMIT = 60 * 1000 // 60 seconds

export class MatrixHandler {

  public appserviceManager!: AppserviceManager
  public wechatyManager!: WechatyManager

  constructor () {
    log.verbose('MatrixHandler', 'constructor()')
  }

  public setManager (
    appserviceManager: AppserviceManager,
    wechatyManager: WechatyManager,
  ): void {
    this.appserviceManager = appserviceManager
    this.wechatyManager = wechatyManager
  }

  public async onEvent (
    request : Request,
    context : BridgeContext,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'onEvent({type: "%s"}, {userId: "%s"})',
      request.data.type,
      context.senders.matrix.userId,
    )

    const event = request.getData()

    if (event.unsigned.age > AGE_LIMIT) {
      log.verbose('MatrixHandler', 'onEvent() skipping event due to age %s > %s',
        event.unsigned.age, AGE_LIMIT)
      return
    }

    if (this.appserviceManager.bridge.getBot().isRemoteUser(event.user_id)) {
      log.verbose('MatrixHandler', 'onEvent() isRemoteUser(%s) is true, skipped', event.user_id)
      return
    }

    try {
      await this.processEvent(event)
    } catch (e) {
      log.error('bridge-user-manager', 'onEvent() exception: %s', e && e.message)
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

  /*******************
   * Private Methods *
   *******************/

  private async processEvent (
    event : Event,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'dispatchEvent("%s")', JSON.stringify(event))

    if (this.appserviceManager.isRoomInvitation(event)) {
      await this.appserviceManager.acceptRoomInvitation(event)
      return
    }

    switch (event.type) {

      case 'm.room.message':
        await this.processRoomMessage(event)
        break

      default:
        log.silly('bridge-user-manager', 'matrix-handlers/on-event dispatchEvent() default for type: ' + event.type)
        break

    }
  }

  private async processRoomMessage (
    event: Event,
  ): Promise<void> {
    log.verbose('MatrixHandler', 'processRoomMessage("%s")', JSON.stringify(event))

    const matrixUser = await this.appserviceManager.userStore.getMatrixUser(event.user_id)
    if (!matrixUser) {
      throw new Error('no matrix user for id: ' + event.user_id)
    }
    const isEnabled = this.appserviceManager.isEnabled(matrixUser)

    if (!isEnabled) {
      log.silly('MatrixHandler', 'processRoomMessage() %s is not enabled for wechaty', event.user_id)
      return
    }

    const wechaty = await this.wechatyManager.wechaty(event.user_id)

    if (!wechaty) {
      log.silly('MatrixHandler', 'processRoomMessage() wechaty not found for user id: ', event.user_id)
      return
    }

    const filehelper = await wechaty.Contact.find('filehelper')
    if (filehelper) {
      await filehelper.say(`Matrix user ${event.user_id} in room ${event.room_id} said: ${event.content}`)
    } else {
      log.error('MatrixHandler', 'processRoomMessage() filehelper not found from wechaty')
    }

    if (!await this.isKnownRoom(event)) {
      await this.replyUnknownRoom(event)
      return
    }

    const contentBody = event.content!.body
    const roomId      = event.room_id
    const senderId    = event.sender
    const userId      = event.user_id

    if (this.appserviceManager.isDirectRoom(event.room_id)) {
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
      log.silly('bridge-user-manager', 'matrix-handlers/on-event-room-message onGroupMessage(%s) did not match any wechat room', args.matrixRoomId)
    }

    console.info('TODO: ', args.matrixUserId, args.matrixRoomId, args.text)
  }

  private gotoEnableWechatyDialog (
    matrixUserId: string,
    text: string,
  ): void {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoEnableDialog(%s, %s)', matrixUserId, text)
  }

  private gotoSetupDialog (matrixUserId: string): void {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoSetupDialog(%s)', matrixUserId)

  }

  private gotoLoginWechatyDialog (matrixUserId: string): void {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message gotoLoginWechatDialog(%s)', matrixUserId)

  }

  private async bridgeToWechatIndividual (
    matrixUserId: string,
    toGhostId: string,
    text: string,
  ): Promise<void> {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message bridgeToWechatIndividual(%s, %s, %s)', matrixUserId, toGhostId, text)
  }

  private async getRoomPair (
    matrixRoomId: string,
  ): Promise<{
    matrixRoom: MatrixRoom,
    remoteRoom: RemoteRoom,
  }> {
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom(%s)', matrixRoomId)

    const roomStore = this.appserviceManager.bridge.getRoomStore()

    if (!roomStore) {
      log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message hasLinkedWechatyRoom() no room store')
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
    log.verbose('bridge-user-manager', 'matrix-handlers/on-event-room-message bridgeToWechatyRoom(%s, %s)',
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
    //   log.warn('bridge-user-manager', 'matrix-handlers on-0event-room-message bridgeToWechatyRoom() %s',
    //     errMsg)
    //   await this.matrixBotIntent.sendText(this.matrixDirectMessageRoomID, errMsg)
    // }

  }

  private async isKnownRoom (
    event: Event,
  ): Promise<boolean> {
    log.verbose('appservice-manager', 'on-event isKnownRoom()')

    const roomStore = await this.appserviceManager.bridge.getRoomStore()
    if (!roomStore) {
      throw new Error('no room store')
    }
    const matrixRoomId = event.room_id
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
    event: Event,
  ): Promise<void> {
    log.verbose('appservice-manager', 'on-event replyUnnownRoom()')

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

    const memberMap = await this.appserviceManager.bridge.getBot().getJoinedMembers(event.room_id)

    const wechatyGhostIdList = Object.keys(memberMap)
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
    await intent.sendText(event.room_id, 'replyUnknownRoom: ' + event.content!.body)
  }

}

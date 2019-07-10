import {
  BridgeContext,
  Event,
  MatrixRoom,
  MatrixUser,
  Request,
  RemoteRoom,
}                   from 'matrix-appservice-bridge'
import { EventType } from 'matrix-js-sdk'

import {
  log,
  MatrixRoomWechatyData,
  WECHATY_DATA_KEY,
  MatrixUserWechatyData,
}                          from './config'

import { AppserviceManager }  from './appservice-manager'
import { WechatyManager }     from './wechaty-manager'

export interface DirectMessageUserPair {
  user    : MatrixUser,
  service : MatrixUser,
}

export interface RoomPair {
  matrix: MatrixRoom,
  remote: RemoteRoom,
}

export class SuperEvent {

  public event: Event

  constructor (
    public request           : Request,
    public context           : BridgeContext,
    public appserviceManager : AppserviceManager,
    public wechatyManager    : WechatyManager,
  ) {
    log.verbose('SuperEvent', 'constructor(request[event_id]="%s", context[sender]="%s", wechatyManager.count()=%s)',
      request.getData().event_id,
      context.senders.matrix.getId(),
      wechatyManager.count(),
    )
    this.event = request.getData()
  }

  public age () {
    return this.event.unsigned.age
  }

  public sender (): MatrixUser {
    return this.context.senders.matrix
  }

  public target (): null | MatrixUser {
    return this.context.targets.matrix
  }

  public room (): MatrixRoom {
    return this.context.rooms.matrix
  }

  public type (): EventType {
    return this.event.type
  }

  public isBotTarget (): boolean {
    if (!this.context.targets.matrix) {
      return false
    }

    const matrixUserId = this.context.targets.matrix.getId()
    return this.appserviceManager.isBot(matrixUserId)
  }

  public isRemoteTarget (): boolean {
    const target = this.target()
    if (!target) {
      return false
    }
    return this.appserviceManager.isGhost(target.getId())
  }

  public isMatrixTarget (): boolean {
    return !this.isRemoteTarget() && !this.isBotTarget()
  }

  /**
   * from @wechaty:
   */
  public isBotSender (): boolean {
    const matrixUserId = this.context.senders.matrix.getId()
    return this.appserviceManager.isBot(matrixUserId)
  }

  /**
   * from @wechaty_.*
   */
  public isGhostSender (): boolean {
    const sender = this.sender()

    return this.appserviceManager.isGhost(sender.getId())
  }

  public isMatrixSender (): boolean {
    return !this.isGhostSender() && !this.isBotSender()
  }

  public isRoomInvitation (): boolean {
    log.verbose('SuperEvent', 'isRoomInvitation() for event id: %s', this.event.event_id)
    const ret = !!(
      this.event.type === 'm.room.member'
      && this.event.content && this.event.content.membership === 'invite'
      && this.event.state_key
    )
    log.silly('SuperEvent', 'isRoomInvitation() for event id: %s -> %s', this.event.event_id, ret)
    return ret
  }

  public async acceptRoomInvitation (): Promise<void> {
    log.verbose('SuperEvent', 'acceptRoomInvitation() for room id: %s', this.event.room_id)

    const inviteeMatrixUserId = this.event.state_key
    const matrixRoomId        = this.event.room_id

    if (!inviteeMatrixUserId) {
      throw new Error('no event.state_key')
    }

    const intent = this.appserviceManager.bridge
      .getIntent(inviteeMatrixUserId)

    await intent.join(matrixRoomId)
  }

  public remoteRoom (): null | RemoteRoom {
    return this.context.rooms.remote
  }

  public async directMessageUserPair (): Promise<DirectMessageUserPair> {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'directMessageUserPair() in room "%s"', matrixRoom.getId())

    const data = matrixRoom.get(WECHATY_DATA_KEY) as MatrixRoomWechatyData
    if (!data) {
      throw new Error('no data')
    }

    const directMessage = data.directMessage
    if (!directMessage) {
      throw new Error('direct message data is undefined(unknown) or null(not a direct message)')
    }

    const matrixUser = await this.appserviceManager.userStore
      .getMatrixUser(directMessage.userId)

    if (!matrixUser) {
      throw new Error('no matrix user for id ' + directMessage.userId)
    }

    const serviceUser = await this.appserviceManager.userStore
      .getMatrixUser(directMessage.serviceId)
    if (!serviceUser) {
      throw new Error('no remote user for id ' + directMessage.serviceId)
    }

    log.silly('SuperEvent', 'directMessageUserPair() in room "%s" -> {user: "%s", service: "%s"}',
      matrixRoom.getId(),
      matrixUser.getId(),
      serviceUser.getId(),
    )

    return {
      service : serviceUser,
      user    : matrixUser,
    }
  }

  public async roomPair (): Promise<null | RoomPair> {
    log.verbose('SuperEvent', 'roomPair()')

    const entryList = await this.appserviceManager.roomStore
      .getEntriesByMatrixId(this.room().getId())

    if (entryList.length <= 0) {
      return null
    }

    const matrix = entryList[0].matrix
    const remote = entryList[0].remote

    if (!matrix || !remote) {
      throw new Error('room not found!')
    }

    return {
      matrix,
      remote,
    }
  }

  public async isDirectMessage (): Promise<boolean> {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'isDirectMessage() room "%s"', matrixRoom.getId())

    let isDM: null | boolean

    isDM = this.isDirectMessageByData(matrixRoom)
    if (isDM === null) {
      isDM = await this.isDirectMessageUserByMember(matrixRoom)
    }

    log.silly('SuperEvent', 'isDirectMessage() room "%s" -> %s', matrixRoom.getId(), isDM)
    return isDM
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  private isDirectMessageByData (
    matrixRoom: MatrixRoom,
  ): null | boolean {
    log.verbose('AppserviceManager', 'directMessageFromData() for room id: %s', matrixRoom.getId())

    let data = matrixRoom.get(WECHATY_DATA_KEY) as MatrixRoomWechatyData

    if (!data) {
      return null
    }

    let isDirect: null | boolean

    switch (data.directMessage) {
      case undefined:
        // Unknown
        log.silly('SuperEvent', 'isDirectRoomFromData() room id "%s" UNKNOWN', matrixRoom.getId())
        isDirect = null
        break

      case false:
        // Not a direct message room
        log.silly('SuperEvent', 'isDirectRoomFromData() room id "%s" NO', matrixRoom.getId())
        isDirect = false
        break

      default:
        // It is a direct message room because the data is set
        log.silly('SuperEvent', 'isDirectRoomFromData() room id "%s" YES', matrixRoom.getId())
        isDirect = true
        break
    }

    return isDirect
  }

  // private directMessageByDMInviter (
  //   matrixRoom: MatrixRoom,
  // ): null | boolean {
  //   log.verbose('AppserviceManager', 'isDriectRoomByDMInviter() for room id: %s', matrixRoom.getId())

  //   // const matrixRoom = this.appserviceManager.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
  //   // matrixRoom!.get('is_direct')

  //   const client = this.appserviceManager.bridge.getClientFactory().getClientAs()
  //   const matrixClientRoom = client.getRoom(matrixRoom.getId())
  //   if (!matrixClientRoom) {
  //     return null
  //   }

  //   const dmInviter = matrixClientRoom.getDMInviter()

  //   return !!dmInviter
  // }

  private async isDirectMessageUserByMember (
    matrixRoom: MatrixRoom,
  ): Promise<boolean> {
    log.verbose('SuperEvent', 'isDirectRoomByMember() room id: "%s"', matrixRoom.getId())

    const memberDict = await this.appserviceManager.bridge.getBot()
      .getJoinedMembers(matrixRoom.getId())
    const memberIdList = Object.keys(memberDict)

    const roomData = { ...matrixRoom.get(WECHATY_DATA_KEY) } as MatrixRoomWechatyData

    const memberNum = memberIdList.length
    if (memberNum !== 2) {
      roomData.directMessage = false
      matrixRoom.set(WECHATY_DATA_KEY, roomData)
      await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

      return false
    }

    const memberId0 = memberIdList[0]
    const memberId1 = memberIdList[1]

    let userId    : string
    let serviceId : string

    if (this.appserviceManager.isUser(memberId0)
      && !this.appserviceManager.isUser(memberId1)
    ) {
      userId    = memberId0
      serviceId = memberId1
    } else if (this.appserviceManager.isUser(memberId1)
      && !this.appserviceManager.isUser(memberId0)
    ) {
      userId    = memberId1
      serviceId = memberId0
    } else {
      throw new Error('memberIdList state unknown: ' + JSON.stringify(memberIdList))
    }

    let matrixUser = await this.appserviceManager.userStore.getMatrixUser(userId)
    if (!matrixUser) {
      log.verbose('SuperEvent', 'isDirectRoomByMember() creating matrix user "%s" in store', userId)
      matrixUser = new MatrixUser(userId)

      await this.appserviceManager.userStore
        .setMatrixUser(matrixUser)
    }

    let serviceUser = await this.appserviceManager.userStore.getMatrixUser(serviceId)
    if (!serviceUser) {
      log.verbose('SuperEvent', 'isDirectRoomByMember() creating matrix user "%s" in store', serviceId)
      serviceUser = new MatrixUser(serviceId)

      await this.appserviceManager.userStore
        .setMatrixUser(serviceUser)
    }

    /**
     * Set directMessage to matrix room
     */
    roomData.directMessage = {
      serviceId,
      userId,
    }

    matrixRoom.set(WECHATY_DATA_KEY, roomData)
    await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

    /**
     * Set directMessageRoomId for matrix user
     */
    const userData = { ...matrixUser.get(WECHATY_DATA_KEY) } as MatrixUserWechatyData
    userData.directMessageRoomId = matrixRoom.getId()
    matrixUser.set(WECHATY_DATA_KEY, userData)
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)

    return true
  }

}

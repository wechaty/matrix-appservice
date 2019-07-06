import {
  BridgeContext,
  Event,
  MatrixRoom,
  MatrixUser,
  RemoteUser,
  Request,
  RemoteRoom,
}                   from 'matrix-appservice-bridge'
import { EventType } from 'matrix-js-sdk'

import {
  log,
  MatrixRoomWechatyData,
  WECHATY_DATA_KEY,
}                          from './config'

import { AppserviceManager }  from './appservice-manager'
import { WechatyManager }     from './wechaty-manager'

export interface DirectMessageUserPair {
  matrix : MatrixUser,
  remote : RemoteUser,
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
    log.verbose('SuperEvent', 'constructor(request[event_id]="%s", context[sender]="%s", wechatyManager.size=%s)',
      request.getData().event_id,
      context.senders.matrix.userId,
      wechatyManager.size(),
    )
    this.event = request.getData()
  }

  public age () {
    return this.event.unsigned.age
  }

  // public appserviceBot (): AppServiceBot {
  //   log.verbose('SuperEvent', 'appserviceBot()')
  //   return this.appserviceManager.bridge
  //     .getBot()
  // }

  // public intent (matrixUserId?: string): Intent {
  //   return this.appserviceManager.bridge
  //     .getIntent(matrixUserId)
  // }

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

    const matrixUserId = this.context.targets.matrix.userId
    return this.appserviceManager.isBot(matrixUserId)
  }

  public isRemoteTarget (): boolean {
    const target = this.target()
    if (!target) {
      return false
    }
    return this.appserviceManager.isGhost(target.userId)
  }

  public isMatrixTarget (): boolean {
    return !this.isRemoteTarget() && !this.isBotTarget()
  }

  public isBotSender (): boolean {
    const matrixUserId = this.context.senders.matrix.userId
    return this.appserviceManager.isBot(matrixUserId)
  }

  public isRemoteSender (): boolean {
    const sender = this.sender()

    return this.appserviceManager.isGhost(sender.userId)
  }

  public isMatrixSender (): boolean {
    return !this.isRemoteSender() && !this.isBotSender()
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
    log.verbose('SuperEvent', 'directMessageUserPair(): room id: "%s"', matrixRoom.roomId)

    const data = matrixRoom.get(WECHATY_DATA_KEY) as MatrixRoomWechatyData
    if (!data) {
      throw new Error('no data')
    }

    const directMessage = data.directMessage
    if (!directMessage) {
      throw new Error('direct message data is undefined(unknown) or null(not a direct message)')
    }

    const matrixUser = await this.appserviceManager.userStore
      .getMatrixUser(directMessage.matrixUserId)

    if (!matrixUser) {
      throw new Error('no matrix user for id ' + directMessage.matrixUserId)
    }

    const remoteUser = await this.appserviceManager.userStore.getRemoteUser(directMessage.remoteUserId)
    if (!remoteUser) {
      throw new Error('no remote user for id ' + directMessage.remoteUserId)
    }

    return {
      matrix: matrixUser,
      remote: remoteUser,
    }
  }

  public async roomPair (): Promise<null | RoomPair> {
    log.verbose('SuperEvent', 'roomPair()')

    const entryList = await this.appserviceManager.roomStore
      .getEntriesByMatrixId(this.room().roomId)

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
    log.verbose('SuperEvent', 'isDirectMessage(): room id: "%s"', matrixRoom.roomId)

    let isDM: null | boolean

    isDM = this.isDirectMessageByData(matrixRoom)
    if (isDM === null) {
      isDM = await this.isDirectMessageUserByMember(matrixRoom)
    }

    log.silly('SuperEvent', 'isDirectMessage(): room id: "%s" -> %s', matrixRoom.roomId, isDM)
    return isDM
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  private isDirectMessageByData (
    matrixRoom: MatrixRoom,
  ): null | boolean {
    log.verbose('AppserviceManager', 'directMessageFromData() for room id: %s', matrixRoom.roomId)

    let data = matrixRoom.get(WECHATY_DATA_KEY) as MatrixRoomWechatyData

    if (!data) {
      return null
    }

    let isDirect: null | boolean

    switch (data.directMessage) {
      case undefined:
        // Unknown
        log.silly('SuperEvent', 'isDirectRoomFromData() room id %s UNKNOWN', matrixRoom.roomId)
        isDirect = null
        break

      case false:
        // Not a direct message room
        log.silly('SuperEvent', 'isDirectRoomFromData() room id %s NO', matrixRoom.roomId)
        isDirect = false
        break

      default:
        // It is a direct message room because the data is set
        log.silly('SuperEvent', 'isDirectRoomFromData() room id %s YES', matrixRoom.roomId)
        isDirect = true
        break
    }

    return isDirect
  }

  // private directMessageByDMInviter (
  //   matrixRoom: MatrixRoom,
  // ): null | boolean {
  //   log.verbose('AppserviceManager', 'isDriectRoomByDMInviter() for room id: %s', matrixRoom.roomId)

  //   // const matrixRoom = this.appserviceManager.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
  //   // matrixRoom!.get('is_direct')

  //   const client = this.appserviceManager.bridge.getClientFactory().getClientAs()
  //   const matrixClientRoom = client.getRoom(matrixRoom.roomId)
  //   if (!matrixClientRoom) {
  //     return null
  //   }

  //   const dmInviter = matrixClientRoom.getDMInviter()

  //   return !!dmInviter
  // }

  private async isDirectMessageUserByMember (
    matrixRoom: MatrixRoom,
  ): Promise<boolean> {
    log.verbose('SuperEvent', 'isDirectRoomByMember() room id: "%s"', matrixRoom.roomId)

    const memberDict = await this.appserviceManager.bridge.getBot()
      .getJoinedMembers(matrixRoom.roomId)

    const memberIdList = Object.keys(memberDict)
    const memberNum    = memberIdList.length
    const data         = { ...matrixRoom.get(WECHATY_DATA_KEY) } as MatrixRoomWechatyData

    if (memberNum !== 2) {

      data.directMessage = false
      matrixRoom.set(WECHATY_DATA_KEY, data)
      await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

      return false

    }

    let matrixUserId: string
    let remoteUserId: string

    if (this.appserviceManager.isGhost(memberIdList[0])
      || this.appserviceManager.isBot(memberIdList[0])
    ) {
      matrixUserId = memberIdList[1]
      remoteUserId = memberIdList[0]
    } else if (this.appserviceManager.isGhost(memberIdList[1])
    || this.appserviceManager.isBot(memberIdList[1])
    ) {
      matrixUserId = memberIdList[0]
      remoteUserId = memberIdList[1]
    } else {
      throw new Error('two member in the room are not paired')
    }

    data.directMessage = {
      matrixUserId,
      remoteUserId,
    }

    let matrixUser = await this.appserviceManager.userStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      matrixUser = new MatrixUser(matrixUserId)
      await this.appserviceManager.userStore
        .setMatrixUser(matrixUser)
    }

    let remoteUser = await this.appserviceManager.userStore.getRemoteUser(remoteUserId)
    if (!remoteUser) {
      remoteUser = new RemoteUser(remoteUserId)
      await this.appserviceManager.userStore
        .setRemoteUser(remoteUser)
    }

    matrixRoom.set(WECHATY_DATA_KEY, data)
    await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

    return true
  }

}

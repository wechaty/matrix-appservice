import {
  AppServiceBot,
  BridgeContext,
  Event,
  Intent,
  MatrixRoom,
  MatrixUser,
  RemoteUser,
  Request,
}                   from 'matrix-appservice-bridge'
import { EventType } from 'matrix-js-sdk'

import {
  log,
  WECHATY_LOCALPART,
}                          from './config'

import { AppserviceManager }  from './appservice-manager'
import { WechatyManager }     from './wechaty-manager'

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

  public appserviceBot (): AppServiceBot {
    log.verbose('SuperEvent', 'appserviceBot()')
    return this.appserviceManager.bridge
      .getBot()
  }

  public intent (matrixUserId?: string): Intent {
    return this.appserviceManager.bridge
      .getIntent(matrixUserId)
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

  public isBotSender (): boolean {
    return (
      WECHATY_LOCALPART === this.context.senders.matrix.localpart
    )
  }

  public isBotTarget (): boolean {
    if (!this.context.targets.matrix) {
      return false
    }
    const localpart = this.context.targets.matrix.localpart
    return localpart === WECHATY_LOCALPART
  }

  public isGhostTarget (): boolean {
    const target = this.target()
    if (!target) {
      return false
    }
    return this.appserviceManager.bridge.getBot()
      .isRemoteUser(target.userId)
  }

  public isMatrixTarget (): boolean {
    return !this.isGhostTarget()
  }

  public isRemoteSender (): boolean {
    const sender = this.sender()

    return this.appserviceManager.bridge.getBot()
      .isRemoteUser(sender.userId)
  }

  public isMatrixSender (): boolean {
    return !this.isRemoteSender()
  }

  public isRoomInvitation (): boolean {
    log.verbose('SuperEvent', 'isRoomInvitation() for event id: %s', this.event.event_id)
    return !!(
      this.event.type === 'm.room.member'
      && this.event.content && this.event.content.membership === 'invite'
      && this.event.state_key
    )
  }

  public async acceptRoomInvitation (): Promise<void> {
    log.verbose('SuperEvent', 'acceptRoomInvitation() for room id: %s', this.event.room_id)

    const inviteeMatrixUserId = this.event.state_key
    const matrixRoomId        = this.event.room_id

    if (!inviteeMatrixUserId) {
      throw new Error('no event.state_key')
    }

    const intent = this.appserviceManager.bridge.getIntent(inviteeMatrixUserId)

    await intent.join(matrixRoomId)
  }

  public directMessageUserPair (): DirectMessageUserPair {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'directMesageTo(): room id: "%s"', matrixRoom.roomId)

    const data = matrixRoom.get('wechaty') as MatrixRoomWechatyData
    if (!data) {
      throw new Error('no data')
    }

    const directMessage = data.directMessage
    if (!directMessage) {
      throw new Error('direct message data is undefined(unknown) or null(not a direct message)')
    }

    // FIXME: ??? await without async ?
    const matrixUser = await this.appserviceManager.userStore.getMatrixUser(directMessage.matrixUserId)
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

  public async directMessage (): Promise<boolean> {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'directMesageTo(): room id: "%s"', matrixRoom.roomId)

    let isDM: null | boolean

    isDM = this.directMessageFromData(matrixRoom)
    if (isDM !== null) {
      return isDM
    }

    isDM = this.directMessageFromDMInviter(matrixRoom)
    if (isDM !== null) {
      return isDM
    }

    isDM = await this.directMessageUserFromMember(matrixRoom)
    if (isDM !== null) {
      return isDM
    }

    matrixRoom.set('isDirectRoom', isDM)
    await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

    console.info('isDirectRoom', isDM)

    return isDM

  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

  private directMessageFromData (
    matrixRoom: MatrixRoom,
  ): null | string {
    log.verbose('AppserviceManager', 'directMessageFromData() for room id: %s', matrixRoom.roomId)

    let data = matrixRoom.get('wechaty') as MatrixRoomWechatyData

    if (!data) {
      return null
    }

    switch (data.directMessageUser) {
      case 'undefined':
        break

      case null:
        break

      default:  // string of matrix user id
        log.silly('SuperEvent', 'isDirectRoomFromData(): room id: %s (cache hit)',
          matrixRoom.roomId, data.isDirect)
        return data.isDirect
        break
    }

    if ( === 'undefined') {
    } else if (data)

    }

    return null
  }

  private directMessageFromDMInviter (
    matrixRoom: MatrixRoom,
  ): null | boolean {
    log.verbose('AppserviceManager', 'isDriectRoomByDMInviter() for room id: %s', matrixRoom.roomId)

    // const matrixRoom = this.appserviceManager.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
    // matrixRoom!.get('is_direct')

    const client = this.appserviceManager.bridge.getClientFactory().getClientAs()
    const matrixClientRoom = client.getRoom(matrixRoom.roomId)
    if (!matrixClientRoom) {
      return null
    }

    const dmInviter = matrixClientRoom.getDMInviter()

    return !!dmInviter
  }

  private async directMessageUserFromMember (
    matrixRoom: MatrixRoom,
  ): Promise<null | boolean> {
    log.verbose('SuperEvent', 'isDirectRoomByMember() room id: "%s"', matrixRoom.roomId)

    const memberMap = await this.appserviceManager.bridge.getBot().getJoinedMembers(matrixRoom.roomId)
    const memberNum = Object.keys(memberMap).length

    if (memberNum === 2) {
      return true
    } else {
      return false
    }
  }

}

export interface MatrixRoomWechatyData {
  directMessage?: false | {
    matrixUserId : string
    remoteUserId : string
  }
}

export interface DirectMessageUserPair {
  matrix : MatrixUser,
  remote : RemoteUser,
}

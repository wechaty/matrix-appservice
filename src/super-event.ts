import {
  Request,
  BridgeContext,
  Event,
  Intent,
  AppServiceBot,
  MatrixUser,
  MatrixRoom,
  Bridge,
}                   from 'matrix-appservice-bridge'
import { EventType } from 'matrix-js-sdk'

import { log, WECHATY_LOCALPART } from './config'

import { WechatyManager }     from './wechaty-manager'

export class SuperEvent {

  public event: Event

  constructor (
    public request           : Request,
    public context           : BridgeContext,
    public bridge            : Bridge,
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
    return this.bridge.getBot()
  }

  public intent (matrixUserId?: string): Intent {
    return this.bridge.getIntent(matrixUserId)
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
    return this.bridge.getBot()
      .isRemoteUser(target.userId)
  }

  public isMatrixTarget (): boolean {
    return !this.isGhostTarget()
  }

  public isRemoteSender (): boolean {
    const sender = this.sender()

    return this.bridge.getBot()
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

    const intent = this.bridge.getIntent(inviteeMatrixUserId)

    await intent.join(matrixRoomId)
  }

  public isDirectRoom (): boolean {
    const matrixRoom = this.room()
    const matrixRoomId = matrixRoom.roomId
    log.verbose('AppserviceManager', 'isDriectRoom() for room id: %s', matrixRoomId)

    // const matrixRoom = this.bridge.getRoomStore()!.getMatrixRoom(matrixRoomId)
    // matrixRoom!.get('is_direct')

    const client = this.bridge.getClientFactory().getClientAs()
    const matrixClientRoom = client.getRoom(matrixRoomId)
    if (!matrixClientRoom) {
      return false
    }

    const dmInviter = matrixClientRoom.getDMInviter()

    return !!dmInviter
  }

  async isDirectRoom2 (): Promise<boolean> {
    const matrixRoom = this.room()
    const matrixRoomId = matrixRoom.roomId
    log.verbose('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s)', matrixRoomId)

    const roomStore = this.bridge.getRoomStore()
    if (!roomStore) {
      throw new Error('no room store')
    }

    let isDirect: boolean = matrixRoom.get('isDirect') as boolean
    if (typeof isDirect === 'boolean') {
      log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache hit)',
        matrixRoomId, isDirect)
      return isDirect
    }

    const memberMap = await this.bridge.getBot().getJoinedMembers(matrixRoomId)
    const memberNum = Object.keys(memberMap).length

    if (memberNum === 2) {
      isDirect = true
    } else {
      isDirect = false
    }
    log.silly('appservice-manager', 'on-non-bridge-user-event isDriectRoom(%s): %s (cache miss)',
      matrixRoomId, isDirect)

    matrixRoom.set('isDirect', isDirect)
    await roomStore.setMatrixRoom(matrixRoom)

    console.info('isDirect', isDirect)

    return isDirect
  }

}

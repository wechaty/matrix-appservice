import type {
  BridgeContext,
  Event,
  MatrixRoom,
  MatrixUser,
  Request,
  EventType,
}                   from 'matrix-appservice-bridge'

import {
  log,
}                           from './config.js'

import type { AppserviceManager }  from './appservice-manager.js'
import type { WechatyManager }     from './wechaty-manager.js'

export interface DirectMessageUserPair {
  user    : MatrixUser,
  service : MatrixUser,
}

export class SuperEvent {

  public event: Event

  constructor (
    public request           : Request,
    public context           : BridgeContext,
    public appserviceManager : AppserviceManager,
    public wechatyManager    : WechatyManager,
  ) {
    log.verbose('SuperEvent', 'constructor(request[event_id]="%s", context[sender]="%s", appserviceManager, wechatyManager.count()=%s)',
      request.getData().event_id,
      context.senders.matrix.getId(),
      wechatyManager.count(),
    )
    this.event = request.getData()
  }

  public text (): string {
    return this.event.content!.body || ''
  }

  /**
   * Return event age in seconds.
   */
  public age (): number {
    return this.event.unsigned.age / 1000
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

  public targetIsBot (): boolean {
    if (!this.context.targets.matrix) {
      return false
    }

    const matrixUserId = this.context.targets.matrix.getId()
    return this.appserviceManager.isBot(matrixUserId)
  }

  public targetIsVirtual (): boolean {
    const target = this.target()
    if (!target) {
      return false
    }
    return this.appserviceManager.isVirtual(target.getId())
  }

  public targetIsUser (): boolean {
    return (
      !this.targetIsVirtual()
      && !this.targetIsBot()
    )
  }

  /**
   * from @wechaty:
   */
  public senderIsBot (): boolean {
    const matrixUserId = this.context.senders.matrix.getId()
    return this.appserviceManager.isBot(matrixUserId)
  }

  /**
   * from @wechaty_.*
   */
  public senderIsVirtual (): boolean {
    const sender = this.sender()

    return this.appserviceManager.isVirtual(sender.getId())
  }

  public senderIsUser (): boolean {
    return (
      !this.senderIsVirtual()
      && !this.senderIsBot()
    )
  }

  public isRoomInvitation (): boolean {
    log.verbose('SuperEvent', 'isRoomInvitation() for event id: %s', this.event.event_id)
    const ret = !!(
      this.event.type === 'm.room.member'
      && this.event.content && this.event.content.membership === 'invite'
      && this.event.state_key
    )
    log.silly('SuperEvent', 'isRoomInvitation() -> %s', ret)
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

}

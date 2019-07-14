import {
  BridgeContext,
  Event,
  MatrixRoom,
  MatrixUser,
  Request,
}                   from 'matrix-appservice-bridge'
import { EventType } from 'matrix-js-sdk'

import {
  APPSERVICE_ROOM_DATA_KEY,
  AppserviceMatrixRoomData,
  log,
}                          from './config'

import { AppserviceManager }  from './appservice-manager'
import { WechatyManager }     from './wechaty-manager'

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
    log.verbose('SuperEvent', 'constructor(request[event_id]="%s", context[sender]="%s", wechatyManager.count()=%s)',
      request.getData().event_id,
      context.senders.matrix.getId(),
      wechatyManager.count(),
    )
    this.event = request.getData()
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

  public isBotTarget (): boolean {
    if (!this.context.targets.matrix) {
      return false
    }

    const matrixUserId = this.context.targets.matrix.getId()
    return this.appserviceManager.isBot(matrixUserId)
  }

  public isVirtualTarget (): boolean {
    const target = this.target()
    if (!target) {
      return false
    }
    return this.appserviceManager.isVirtual(target.getId())
  }

  public isUserTarget (): boolean {
    return (
      !this.isVirtualTarget()
      && !this.isBotTarget()
    )
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
  public isVirtualSender (): boolean {
    const sender = this.sender()

    return this.appserviceManager.isVirtual(sender.getId())
  }

  public isUserSender (): boolean {
    return (
      !this.isVirtualSender()
      && !this.isBotSender()
    )
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

  public async directMessageUserPair (): Promise<DirectMessageUserPair> {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'directMessageUserPair() in room "%s"', matrixRoom.getId())

    const {
      consumerId,
      directUserId,
    } = {
      ...matrixRoom.get(
        APPSERVICE_ROOM_DATA_KEY
      ),
    } as AppserviceMatrixRoomData
    if (!directUserId) {
      throw new Error('no directUserId found)')
    }

    const consumerUser = await this.appserviceManager
      .matrixUser(consumerId)
    const serviceUser  = await this.appserviceManager
      .matrixUser(directUserId)

    log.silly('SuperEvent', 'directMessageUserPair() in room "%s" -> {user: "%s", service: "%s"}',
      matrixRoom.getId(),
      consumerUser.getId(),
      serviceUser.getId(),
    )

    return {
      service : serviceUser,
      user    : consumerUser,
    }
  }

  public async isDirectMessage (): Promise<boolean> {
    const matrixRoom = this.room()
    log.verbose('SuperEvent', 'isDirectMessage() room "%s"', matrixRoom.getId())

    const { directUserId } = {
      ...matrixRoom.get(
        APPSERVICE_ROOM_DATA_KEY
      ),
    } as AppserviceMatrixRoomData

    const isDM = !!directUserId

    log.silly('SuperEvent', 'isDirectMessage() room "%s" -> %s', matrixRoom.getId(), isDM)
    return isDM
  }

  /****************************************************************************
   * Private Methods                                                         *
   ****************************************************************************/

}

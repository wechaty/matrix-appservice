import {
  Request,
  BridgeContext,
  Bridge,
  Intent,
}                   from 'matrix-appservice-bridge'
import {
  Message,
  Wechaty,
  Contact,
  ScanStatus,
}                   from 'wechaty'

import {
  log,
}             from '../config'

import {
  onLogin as onWechatyLogin,
  onLogout as onWechatyLogout,
  onMessage as onWechatyMessage,
  onScan as onWechatyScan,
}                                   from './wechaty-handlers/'

import {
  onEvent as onMatrixEvent,
  // onUserQuery as onMatrixUserQuery,
}                                   from './matrix-handlers/'

export class BridgeUser {

  public readonly matrixUserLocalPart : string
  public readonly matrixUserDomain    : string

  public readonly matrixUserIntent    : Intent
  public readonly appServiceBotIntent : Intent

  public readonly matrixDirectMessageRoomID: string

  constructor (
    public readonly matrixUserId : string,
    public readonly bridge       : Bridge,
    public readonly wechaty      : Wechaty,
  ) {
    log.verbose('BridgeUser', 'constructor(%s,,)', matrixUserId)

    const matches = matrixUserId.match(/^@(.+):(.+)$/)
    if (!matches) {
      throw new Error('can not parse matrixUserId: ' + matrixUserId)
    }

    this.matrixUserLocalPart = matches[1]
    this.matrixUserDomain    = matches[2]

    this.appServiceBotIntent = bridge.getIntent(null)
    this.matrixUserIntent    = bridge.getIntent(matrixUserId)

    // FIXME: query, or create it if not exists
    this.matrixDirectMessageRoomID = '!LeCbPwJxwjorqLHegf:aka.cn'
  }

  public async onWechatyMessage (msg: Message) {
    log.verbose('BridgeUser', 'onWechatyMessage()')
    return onWechatyMessage.call(this, msg)
  }

  public async onWechatyLogin (user: Contact) {
    log.verbose('BridgeUser', 'onWechatyLogin()')
    return onWechatyLogin.call(this, user)
  }

  public async onWechatyLogout (user: Contact) {
    log.verbose('BridgeUser', 'onWechatyLogout()')
    return onWechatyLogout.call(this, user)
  }

  public async onWechatyScan (code: string, status: ScanStatus) {
    log.verbose('BridgeUser', 'onWechatyScan()')
    return onWechatyScan.call(this, code, status)
  }

  // public async onMatrixUserQuery (queriedUser: any) {
  //   log.verbose('BridgeUser', 'onMatrixUserQuery()')
  //   return onMatrixUserQuery.call(this, queriedUser)
  // }

  public async onMatrixEvent (
    request: Request,
    context: BridgeContext,
  ) {
    log.verbose('BridgeUser', 'onMatrixEvent()')
    return onMatrixEvent.call(this, request, context)
  }

}

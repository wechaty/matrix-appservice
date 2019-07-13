/**
 * To make ts-node happy without --files args
 * Note: this <reference ... /> must be put before all code, or it will be ignored.
 */
/// <reference path="./typings/matrix-appservice-bridge.d.ts" />
/// <reference path="./typings/matrix-js-sdk.d.ts" />

import path from 'path'
import { WechatyOptions } from 'wechaty'

/**
 * Export
 */

export { log } from 'wechaty'

export { VERSION }        from './version'

export const AGE_LIMIT_SECONDS = 60    // 60 seconds
export const DEFAULT_PORT      = 8788  // W:87 X:88

export const APPSERVICE_WECHATY_DATA_KEY = 'wechatyAppservice'
export const APPSERVICE_ROOM_DATA_KEY    = 'wechatyAppserviceRoom'
export const APPSERVICE_USER_DATA_KEY    = 'wechatyAppserviceUser'

export const WECHATY_LOCALPART = 'wechaty'
export const REGISTRATION_FILE = 'wechaty-registration.yaml'
export const SCHEMA_FILE       = path.join(__dirname, '../config/schema.yaml')

export interface AppserviceMatrixRoomData {
  consumerId : string   // the matrix user who is using the matrix-appservice-wechaty

  /**
   *  matrixUserId & wechatyRoomId should only be set one, and leave the other one to be undefined.
   *
   * 1. If directUSerId is set, then this room is a direct message room, between the consumerId and directUserId
   * 2. If wechatyRoomId is set, then this room is a group room, linked to the wechatyRoomId as well.
   */
  directUserId?  : string   // for a direct message room (user to user private message)
  wechatyRoomId? : string   // for a group room (3+ people)
}

export interface AppserviceMatrixUserData {
  consumerId       : string  // the matrix user who is using the matrix-appservice-wechaty
  wechatyContactId : string  // the wechaty contact id that this user linked to

  directRoomId?    : string  // direct message betwen the virtual user with the matrix consumer

  name?   : string
  avatar? : string
}

export interface AppserviceWechatyData {
  enabled         : boolean           // enable / disable the bridge
  wechatyOptions? : WechatyOptions
}

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

export const WECHATY_DATA_KEY  = 'wechaty'
export const WECHATY_LOCALPART = 'wechaty'
export const REGISTRATION_FILE = 'wechaty-registration.yaml'
export const SCHEMA_FILE       = path.join(__dirname, '../config/schema.yaml')

export interface MatrixRoomWechatyData {
  directMessage?: false | {
    userId    : string
    serviceId : string
  }
}

export interface MatrixUserWechatyData {
  directMessageRoomId? : string,
  options?             : WechatyOptions,
}

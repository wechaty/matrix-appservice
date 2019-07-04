import path from 'path'

/**
 * Export
 */

export { log } from 'wechaty'

export { VERSION }        from './version'

export const AGE_LIMIT    = 60      // 60 seconds
export const DEFAULT_PORT = 8788    // W:87 X:88

export const WECHATY_LOCALPART = 'wechaty'
export const REGISTRATION_FILE = 'wechaty-registration.yaml'
export const SCHEMA_FILE       = path.join(__dirname, '../config/schema.yaml')

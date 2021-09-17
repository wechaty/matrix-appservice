import path from 'path'

/**
 * Export
 */

export { log } from 'wechaty'

export { VERSION } from './version.js'

export const AGE_LIMIT_SECONDS = 5 * 60   // 5 minutes
export const DEFAULT_PORT      = 8788     // W:87 X:88

export const REGISTRATION_FILE = 'wechaty-registration.yaml'
export const SCHEMA_FILE       = path.join(path.resolve(), 'config/schema.yaml')

import path from 'path'

export { log } from 'brolog'

export { VERSION }  from './version'

export const DEFAULT_PORT        = 8788                                           // W:87 X:88
export const MATRIX_WECHATY_NAME = 'wechaty'
export const REGISTRATION_FILE   = 'wechaty-registration.yaml'
export const SCHEMA_FILE         = path.join(__dirname, '../config/schema.yaml')
export const WECHATY_NAME        = 'wechaty-matrix'

import {
  AppServiceRegistration,
}                             from 'matrix-appservice-bridge'

const MATRIX_WECHATY_NAME = 'wechaty'

export function generateRegistration (
  reg      : any,
  callback : (r: any) => void,
): void {
    reg.setHomeserverToken(AppServiceRegistration.generateToken())
    reg.setAppServiceToken(AppServiceRegistration.generateToken())

    // reg.setId(AppServiceRegistration.generateToken())
    reg.setId(MATRIX_WECHATY_NAME)
    reg.setSenderLocalpart(MATRIX_WECHATY_NAME)
    reg.setProtocols([MATRIX_WECHATY_NAME])

    reg.addRegexPattern('aliases', `#${MATRIX_WECHATY_NAME}_.+`, true)
    reg.addRegexPattern('rooms', `!${MATRIX_WECHATY_NAME}_.+`, true)
    reg.addRegexPattern('users', `@${MATRIX_WECHATY_NAME}_.+`, true)

    callback(reg)
  }

import {
  AppServiceRegistration,
}                             from 'matrix-appservice-bridge'

const MATRIX_LOCAL_PART = 'wechaty'

export function generateRegistration (
  reg      : any,
  callback : Function,
): void {
    reg.setId(AppServiceRegistration.generateToken())
    reg.setHomeserverToken(AppServiceRegistration.generateToken())
    reg.setAppServiceToken(AppServiceRegistration.generateToken())
    reg.setSenderLocalpart(MATRIX_LOCAL_PART)
    reg.setProtocols(['wechaty'])
    reg.addRegexPattern("users", `@${MATRIX_LOCAL_PART}_.+`, true)
    reg.addRegexPattern("rooms", `!${MATRIX_LOCAL_PART}_.+`, true)
    callback(reg)
  }

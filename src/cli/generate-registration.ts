import {
  AppServiceRegistration,
}                             from 'matrix-appservice-bridge'

const APPSERVICE_LOCALPART = 'wechaty'

export function generateRegistration (
  reg      : any,
  callback : (r: any) => void,
): void {
  reg.setHomeserverToken(AppServiceRegistration.generateToken())
  reg.setAppServiceToken(AppServiceRegistration.generateToken())

  // reg.setId(AppServiceRegistration.generateToken())
  reg.setId(APPSERVICE_LOCALPART)
  reg.setSenderLocalpart(APPSERVICE_LOCALPART)
  reg.setProtocols([APPSERVICE_LOCALPART])
  reg.setRateLimited(false)

  reg.addRegexPattern('aliases', `#${APPSERVICE_LOCALPART}_.*`, true)
  reg.addRegexPattern('users', `@${APPSERVICE_LOCALPART}_.*`, true)

  callback(reg)
}

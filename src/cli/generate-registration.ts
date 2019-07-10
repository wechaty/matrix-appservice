import {
  AppServiceRegistration,
}                             from 'matrix-appservice-bridge'

import {
  WECHATY_LOCALPART,
}                             from '../config'

export function generateRegistration (
  reg      : any,
  callback : (r: any) => void,
): void {
  reg.setHomeserverToken(AppServiceRegistration.generateToken())
  reg.setAppServiceToken(AppServiceRegistration.generateToken())

  // reg.setId(AppServiceRegistration.generateToken())
  reg.setId(WECHATY_LOCALPART)
  reg.setSenderLocalpart(WECHATY_LOCALPART)
  reg.setProtocols([WECHATY_LOCALPART])
  reg.setRateLimited(false)

  reg.addRegexPattern('aliases', `#${WECHATY_LOCALPART}_.*`, true)
  reg.addRegexPattern('users', `@${WECHATY_LOCALPART}_.*`, true)

  callback(reg)
}

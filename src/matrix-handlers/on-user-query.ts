import {
  log,
}                   from '../config'
import { WechatyManager } from '../wechaty-manager'
import { AppserviceManager } from '../appservice-manager'

export async function onUserQuery (
  queriedUser       : any,
  appServiceManager : AppserviceManager,
  wechatyManager    : WechatyManager,
): Promise<object> {
  log.verbose('appservice-manager', 'on-user-query onUserQuery("%s")', JSON.stringify(queriedUser))

  // if (isBridgeUser(matrixUserId)) {
  //   const wechaty = this.wechatyManager!.get(matrixUserId)
  //   const bridgeUser = new BridgeUser(matrixUserId, this.bridge!, wechaty)

  //   onBridgeUserUserQuery.call(bridgeUser, queriedUser)
  //     .catch(e => {
  //       log.error('AppServiceManager', 'onUserQuery() onBridgeUserUserQuery() rejection: %s', e && e.message)
  //     })
  // try {
  //   const provision = await onUserQuery.call(this, queriedUser)
  //   return provision
  // } catch (e) {
  //   log.error('AppServiceManager', 'onUserQuery() rejection: %s', e && e.message)
  // }

  // auto-provision users with no additonal data
  return {}
}

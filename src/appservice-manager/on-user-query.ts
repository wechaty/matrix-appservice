import {
  log,
}         from '../config'

import { AppServiceManager } from './appservice-manager'

export async function onUserQuery (
  manager: AppServiceManager,
  queriedUser: any,
): Promise<object> {
  log.verbose('on-user-query', 'onUserQuery(manager,"%s")', JSON.stringify(queriedUser))
  console.info(manager)
  return {} // auto-provision users with no additonal data
}

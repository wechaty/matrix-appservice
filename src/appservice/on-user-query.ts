import { log } from '../config'

export function onUserQuery (queriedUser: any): object {
  log.verbose('AppService', 'onUserQuery(%s)', queriedUser)
  return {} // auto-provision users with no additonal data
}

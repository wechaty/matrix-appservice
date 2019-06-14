import {
  Bridge,
}           from 'matrix-appservice-bridge'

import {
  REGISTRATION_FILE,
}                     from '../config'

import { onEvent }     from './on-event'
import { onUserQuery } from './on-user-query'

let instance: Bridge

export function getBridge (): Bridge {
  if (!instance) {
    instance = createBridge()
  }

  return instance
}

function createBridge (): Bridge {

  const domain        = 'aka.cn'
  const homeserverUrl = 'http://matrix.aka.cn:8008'
  const registration  = REGISTRATION_FILE

  const controller = {
    onEvent,
    onUserQuery,
  }

  const bridge = new Bridge({
    controller,
    domain,
    homeserverUrl,
    registration,
  })

  return bridge
}

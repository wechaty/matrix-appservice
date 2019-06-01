import {
  Bridge,
}                             from 'matrix-appservice-bridge'

import {
  MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
}                                             from '../config'

import { onEvent }     from './on-event'
import { onUserQuery } from './on-user-query'

const controller = {
  onUserQuery,
  onEvent,
}

let bridge: Bridge

export function getBridge (): Bridge {
  if (!bridge) {
    bridge = createBridge()
  }

  return bridge


}

function createBridge (): Bridge {
  const bridge = new Bridge({
    homeserverUrl: 'http://matrix.aka.cn:8008',
    domain: 'aka.cn',
    registration: MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
    controller,
  })
  return bridge
}

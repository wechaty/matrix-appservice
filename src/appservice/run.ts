import {
  Bridge,
}                             from 'matrix-appservice-bridge'

import {
  MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
}                                             from '../config'

import { onEvent }     from './on-event'
import { onUserQuery } from './on-user-query'

const ROOM_ID = '!KHasJNPkKLsCkLHqoO:aka.cn'

const controller = {
  onUserQuery,
  onEvent,
}

export function run (
  port   : number,
  config : any
): void {
  const bridge = new Bridge({
    homeserverUrl: 'http://matrix.aka.cn:8008',
    domain: 'aka.cn',
    registration: MATRIX_APPSERVICE_REGISTRATION_YAML_FILE,
    controller,
  })

  console.log('Matrix-side listening on port %s', port)
  bridge.run(port, config)

  const intent = bridge.getIntent('@wechaty_' + 'tester' + ':aka.cn')
  intent.sendText(ROOM_ID, 'hello matrix')
}

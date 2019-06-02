import { log } from '../config'

import { getBridge }     from './get-bridge'
// FIXME:
// const ROOM_ID = '!KHasJNPkKLsCkLHqoO:aka.cn'

export function run (
  port   : number,
  config : object,
): void {
  const bridge = getBridge()

  log.verbose('run', 'config: %s', JSON.stringify(config))

  log.info('run', 'Matrix-side listening on port %s', port)
  bridge.run(port, config)

  // const intent = bridge.getIntent('@wechaty_' + 'tester' + ':aka.cn')
  // intent.sendText(ROOM_ID, 'hello matrix')
}

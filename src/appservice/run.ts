import { log } from '../config'

import { getBridge }     from './get-bridge'
// FIXME:
// const ROOM_ID = '!KHasJNPkKLsCkLHqoO:aka.cn'

export async function run (
  port   : number,
  config : object,
): Promise<void> {
  const bridge = getBridge()

  log.verbose('run', 'config: %s', JSON.stringify(config))

  log.info('run', 'Matrix-side listening on port %s', port)
  await bridge.run(port, config)

  // const tester1 = bridge.getIntent('@wechaty_tester1:aka.cn')
  // const tester2 = bridge.getIntent('@wechaty_tester1:aka.cn')

  // tester1.

  // const intent = bridge.getIntent('@wechaty_' + 'tester' + ':aka.cn')
  // intent.sendText(ROOM_ID, 'hello matrix')
}

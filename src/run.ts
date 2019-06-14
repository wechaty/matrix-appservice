import { log } from '../config'

import { getBridge }     from './get-bridge'

export async function run (
  port   : number,
  config : object,
): Promise<void> {
  log.info('run', 'listening on port %s', port)
  log.verbose('run', 'config: %s', JSON.stringify(config))

  const bridge = getBridge()
  await bridge.run(port, config)

  // const tester1 = bridge.getIntent('@wechaty_tester1:aka.cn')
  // const tester2 = bridge.getIntent('@wechaty_tester1:aka.cn')

  // tester1.

  const intent = bridge.getIntent('@wechaty_' + 'tester' + ':aka.cn')

  const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'
  intent.sendText(ROOM_ID, 'hello matrix')
}

import { AppServiceManager } from './appservice-manager'

import {
  log,
}                 from '../config'

export async function bootstrap (
  manager: AppServiceManager
): Promise<void> {
  log.verbose('bootstrap', 'bootstrap()')

  // const tester1 = bridge.getIntent('@wechaty_tester1:aka.cn')
  // const tester2 = bridge.getIntent('@wechaty_tester1:aka.cn')

  // TODO:

  const intent = manager.bridge!.getIntent('@wechaty_' + 'tester' + ':aka.cn')

  const ROOM_ID = '!LeCbPwJxwjorqLHegf:aka.cn'
  await intent.sendText(ROOM_ID, 'hello matrix')
}

import {
  Wechaty,
  WechatyOptions,
}                   from 'wechaty'

import { log } from '../config'

import { AppServiceManager } from '../appservice-manager/'
import { initWechaty } from './start-wechaty'

export class WechatyManager {

  private appServiceManager? : AppServiceManager
  private wechatyStore       : Map<string, Wechaty>

  constructor () {
    log.verbose('WechatyManager', 'constructor()')

    this.wechatyStore = new Map<string, Wechaty>()
  }

  public connect (
    appServiceManager: AppServiceManager,
  ): void {
    log.verbose('WechatyManager', 'connect()')

    if (this.appServiceManager) {
      throw new Error('should not connect appServiceManager more than once.')
    }

    this.appServiceManager = appServiceManager
  }

  public async start (): Promise<void> {
    log.verbose('WechatyManager', 'start()')

    if (!this.appServiceManager) {
      throw new Error(`there's no appSrviceManager yet. call connect() first`)
    }

    const optionList = this.appServiceManager.getWechatyOptionsList()
    for (const wechatyOption of optionList) {
      this.add(wechatyOption)
    }

    // loop start wechaty pool
    for (const [name, wechaty] of this.wechatyStore) {
      await wechaty.start()
        .then(() => log.verbose('WechatyManager', 'start() %s started', name))
        .catch(e => log.error('WechatyManager', 'start() %s rejection', name, e && e.message))
    }
  }

  public get (name: string): Wechaty {
    log.verbose('WechatyManager', 'get(%s)', name)

    const wechaty = this.wechatyStore.get(name)
    if (!wechaty) {
      throw new Error(`wechaty store no such key ${name}`)
    }
    return wechaty
  }

  public async add (wechatyOptions: WechatyOptions): Promise<void> {
    log.verbose('WechatyManager', 'add("%s")', JSON.stringify(wechatyOptions))

    const name = wechatyOptions.name
    if (!name) {
      throw new Error('wechaty manager needs a name to manage wechaty')
    }

    if (this.wechatyStore.has(name)) {
      throw new Error(`${name} is already exist`)
    }

    const wechaty = new Wechaty(wechatyOptions)
    await initWechaty(wechaty)

    this.wechatyStore.set(name, wechaty)
  }

  public async del (
    name: string,
  ): Promise<void> {
    log.verbose('WechatyManager', 'del(%s)', name)

    const wechaty = this.wechatyStore.get(name)

    if (!wechaty) {
      throw new Error(`wechaty store no such key ${name}`)
    }

    await wechaty.stop()

    this.wechatyStore.delete(name)
  }

}

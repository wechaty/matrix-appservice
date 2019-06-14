import {
  Wechaty,
  PuppetModuleName,
}                   from 'wechaty'

import {
  PuppetOptions,
}                   from 'wechaty-puppet'

import { log } from '../config'

import { AppServiceManager } from '../appservice-manager/'

export class WechatyManager {

  private appServiceManager? : AppServiceManager
  private wechatyStore       : Map<string, Wechaty>

  constructor () {
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

    // loop start wechaty pool
  }

  public get (key: string): undefined | Wechaty {
    return this.wechatyStore.get(key)
  }

  public add (
    key            : string,
    puppet?        : PuppetModuleName,
    puppetOptions? : PuppetOptions,
  ): void {
    if (this.wechatyStore.has(key)) {
      throw new Error(`${key} is already exist`)
    }

    const wechaty = new Wechaty({
      name: key,
      puppet,
      puppetOptions,
    })

    this.wechatyStore.set(key, wechaty)
  }

  public del (
    key: string,
  ): void {
    if (!this.wechatyStore.has(key)) {
      throw new Error(`wechaty store no such key ${key}`)
    }
    this.wechatyStore.delete(key)
  }

}

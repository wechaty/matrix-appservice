import type {
  WechatyOptions,
}                     from 'wechaty'

import type {
  MatrixUser,
}                     from 'matrix-appservice-bridge'

import {
  log,
}           from './config.js'
import type { AppserviceManager } from './appservice-manager.js'
import { Manager } from './manager.js'

const WECHATY_BRIDGE_DATA_KEY = 'wechatyBridge'

interface WechatyBridgeData {
  enabled         : boolean           // enable / disable the bridge
  wechatyOptions? : WechatyOptions
}

export class UserManager extends Manager {

  public appserviceManager!: AppserviceManager

  constructor () {
    super()
    log.verbose('Usermanager', 'constructor()')
  }

  public teamManager (managers: {
    appserviceManager: AppserviceManager,
  }) {
    this.appserviceManager = managers.appserviceManager
  }

  public async list (): Promise<MatrixUser[]> {
    log.verbose('Usermanager', 'list()')

    const data = {
      enabled: true,
    } as WechatyBridgeData

    const query = this.appserviceManager.storeQuery(
      WECHATY_BRIDGE_DATA_KEY,
      data,
    )

    const matrixUserList = await this.appserviceManager.userStore.getByMatrixData(query)
    log.silly('Usermanager', 'enabledUserList() total number %s', matrixUserList.length)

    return matrixUserList
  }

  public isEnabled (
    matrixUser: MatrixUser,
  ): boolean {
    log.verbose('Usermanager', 'isEnabled(%s)', matrixUser.getId())

    const data = {
      ...matrixUser.get(
        WECHATY_BRIDGE_DATA_KEY
      ),
    } as WechatyBridgeData

    const enabled = !!data.enabled
    log.silly('Usermanager', 'isEnable(%s) -> %s', matrixUser.getId(), enabled)
    return !!enabled
  }

  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('Usermanager', 'enable(%s)', matrixUser.getId())

    if (this.isEnabled(matrixUser)) {
      throw new Error(`matrixUserId ${matrixUser.getId()} has already enabled`)
    }

    const data = {
      ...matrixUser.get(
        WECHATY_BRIDGE_DATA_KEY
      ),
    } as WechatyBridgeData

    data.enabled = true

    matrixUser.set(
      WECHATY_BRIDGE_DATA_KEY,
      data,
    )
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)
  }

  public async disable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('Usermanager', 'disable(%s)', matrixUser.getId())

    const data = {
      ...matrixUser.get(
        WECHATY_BRIDGE_DATA_KEY
      ),
    } as WechatyBridgeData

    data.enabled = false

    matrixUser.set(
      WECHATY_BRIDGE_DATA_KEY,
      data,
    )
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)
  }

  public wechatyOptions (matrixUser: MatrixUser, wechatyOptions: WechatyOptions): Promise<void>
  public wechatyOptions (matrixUser: MatrixUser): WechatyOptions

  public wechatyOptions (
    matrixUser      : MatrixUser,
    wechatyOptions? : WechatyOptions,
  ): Promise<void> | WechatyOptions {
    log.verbose('Usermanager', 'wechatyOptions(%s,%s)',
      matrixUser.getId(),
      wechatyOptions
        ? JSON.stringify(wechatyOptions)
        : '',
    )

    const that = this

    if (wechatyOptions) {
      setWechatyOptions()
        .catch(console.error)
      return Promise.resolve()
    } else {
      return getWechatyOptions()
    }

    function setWechatyOptions () {
      log.silly('Usermanager', 'setWechatyOptions(%s, "%s") SET',
        matrixUser.getId(), JSON.stringify(wechatyOptions))
      const data = {
        ...matrixUser.get(
          WECHATY_BRIDGE_DATA_KEY
        ),
      } as WechatyBridgeData

      data.wechatyOptions = wechatyOptions

      matrixUser.set(WECHATY_BRIDGE_DATA_KEY, data)
      return that.appserviceManager.userStore.setMatrixUser(matrixUser)
    }

    function getWechatyOptions () {
      log.silly('Usermanager', 'getWechatyOptions(%s)', matrixUser.getId())

      const data = {
        ...matrixUser.get(
          WECHATY_BRIDGE_DATA_KEY
        ),
      } as WechatyBridgeData

      log.silly('Usermanager', 'wechatyOptionsGet(%s) -> "%s"',
        matrixUser.getId(), JSON.stringify(data.wechatyOptions))

      return {
        ...data.wechatyOptions,
      }
    }
  }

}

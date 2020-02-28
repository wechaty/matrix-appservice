import {
  WechatyOptions,
}                     from 'wechaty'

import {
  MatrixUser,
}                     from 'matrix-appservice-bridge'

import {
  log,
}           from './config'
import { AppserviceManager } from './appservice-manager'

interface WechatyBridgeData {
  enabled         : boolean           // enable / disable the bridge
  wechatyOptions? : WechatyOptions
}

const WECHATY_BRIDGE_DATA_KEY = 'wechatyBridge'

export class UserManager {

  public appserviceManager!: AppserviceManager

  constructor () {
    log.verbose('UserManager', 'constructor()')
  }

  public setManager (managers: {
    appserviceManager: AppserviceManager,
  }) {
    this.appserviceManager = managers.appserviceManager
  }

  public async list (): Promise<MatrixUser[]> {
    log.verbose('UserManager', 'list()')

    const data = {
      enabled: true,
    } as WechatyBridgeData

    const query = this.appserviceManager.storeQuery(
      WECHATY_BRIDGE_DATA_KEY,
      data,
    )

    const matrixUserList = await this.appserviceManager.userStore.getByMatrixData(query)
    log.silly('UserManager', 'enabledUserList() total number %s', matrixUserList.length)

    return matrixUserList
  }

  public isEnabled (
    matrixUser: MatrixUser,
  ): boolean {
    log.verbose('UserManager', 'isEnabled(%s)', matrixUser.getId())

    const data = {
      ...matrixUser.get(
        WECHATY_BRIDGE_DATA_KEY
      ),
    } as WechatyBridgeData

    const enabled = !!data.enabled
    log.silly('UserManager', 'isEnable(%s) -> %s', matrixUser.getId(), enabled)
    return !!enabled
  }

  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('UserManager', 'enable(%s)', matrixUser.getId())

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
    log.verbose('UserManager', 'disable(%s)', matrixUser.getId())

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
    log.verbose('UserManager', 'wechatyOptions(%s,%s)',
      matrixUser.getId(),
      wechatyOptions
        ? JSON.stringify(wechatyOptions)
        : '',
    )

    const that = this

    if (wechatyOptions) {
      return setWechatyOptions()
    } else {
      return getWechatyOptions()
    }

    function setWechatyOptions () {
      log.silly('UserManager', 'setWechatyOptions(%s, "%s") SET',
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
      log.silly('UserManager', 'getWechatyOptions(%s)', matrixUser.getId())

      const data = {
        ...matrixUser.get(
          WECHATY_BRIDGE_DATA_KEY
        ),
      } as WechatyBridgeData

      log.silly('UserManager', 'wechatyOptionsGet(%s) -> "%s"',
        matrixUser.getId(), JSON.stringify(data.wechatyOptions))

      return {
        ...data.wechatyOptions,
      }
    }
  }

}

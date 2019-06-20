import { MatrixUser } from 'matrix-appservice-bridge'
import { WechatyOptions } from 'wechaty'

const WECHATY_REGISTERED_KEY = 'wechaty'
const WECHATY_OPTIONS_KEY    = 'wechatyOptions'

export function wechatyEnabled (matrixUser: MatrixUser): boolean {
  return matrixUser.get(WECHATY_REGISTERED_KEY)
}

export function wechatyConfig (matrixUser: MatrixUser): any {
  return matrixUser.get(WECHATY_OPTIONS_KEY)
}

export function wechatyQueryFilter () {
  const queryFilter = {} as {
    [key: string]: boolean
  }

  queryFilter[WECHATY_REGISTERED_KEY] = true

  return queryFilter
}

export function enableWechaty (
  matrixUser: MatrixUser,
  wechatyOptions?: WechatyOptions,
): void {
  matrixUser.set(WECHATY_REGISTERED_KEY,  true)
  matrixUser.set(WECHATY_OPTIONS_KEY,     wechatyOptions)
}

export async function disableWechaty (matrixUser: MatrixUser): Promise<void> {
  matrixUser.set(WECHATY_REGISTERED_KEY,  false)
  matrixUser.set(WECHATY_OPTIONS_KEY,     undefined)
}

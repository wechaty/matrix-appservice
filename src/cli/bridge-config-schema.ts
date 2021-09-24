import type { AppServiceRegistration } from 'matrix-appservice-bridge'

/**
 * This interface should be sync with ../config/schema.yaml
 */
export interface BridgeConfig extends Record<string, unknown> {
  domain        : string
  homeserverUrl : string
  registration  : AppServiceRegistration
}

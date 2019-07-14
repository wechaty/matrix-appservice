import { AppServiceRegistration } from 'matrix-appservice-bridge'

/**
 * This interface should be sync with ../config/schema.yaml
 */
export interface BridgeConfig {
  domain        : string
  homeserverUrl : string
  registration  : AppServiceRegistration
}

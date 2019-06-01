declare module 'matrix-appservice-bridge' {
  type Controller = any
  type Intent = any
  const Cli: any

  const AppServiceRegistration = {
    generateToken: () => string
  }

  interface BridgeOptions {
    homeserverUrl: string
    domain: string
    registration: string
    controller: Controller
  }

  class Bridge {
    constructor (options: BridgeOptions)
    run (port: number, config: any)
    getIntent (id: string): Intent
  }
}

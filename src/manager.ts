/* eslint no-use-before-define: off */
export interface Managers {
  [manager: string]: Manager
}

export abstract class Manager {

  public abstract teamManager (managers: Managers): void

}

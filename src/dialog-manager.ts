
export class DialogManager {

  static dialogDict: Map<string, DialogManager>

  public static dialog (
    matrixRoomId: string,
  ): DialogManager {

    if (!this.dialogDict) {
      this.dialogDict = new Map<string, DialogManager>()
    }

    if (this.dialogDict.has(matrixRoomId)) {
      return this.dialogDict.get(matrixRoomId)!
    }

    const dialogManager = new DialogManager()
    this.dialogDict.set(matrixRoomId, dialogManager)
    return dialogManager
  }

  constructor () {

  }

  public test () {

  }

}

import {
  Room as WechatyRoom,
  Contact as WechatyUser,
}                             from 'wechaty'

import {
  MatrixRoom,
  MatrixUser,
}                             from 'matrix-appservice-bridge'

import {
  log,
}                            from './config'
import { WechatyManager }     from './wechaty-manager'
import { AppserviceManager }  from './appservice-manager'

interface MapRoomData {
  ownerId : string   // the matrix user id who is using the matrix-appservice-wechaty

  /**
   * 1 or 2:
   *  directUserId & wechatyRoomId should only be set one, and leave the other one to be undefined.
   */

  /*
   * 1. If matrixUserId is set, then this room is a direct message room, between the ownerId and matrixUserId
   */
  matrixUserId? : string // for a direct message room (user to user private message, exactly 2 people)
  /**
   * 2. If wechatyRoomId is set, then this room is a group room, linked to the wechatyRoomId as well.
   */
  wechatyRoomId? : string // for a group room (not direct message, >2 people)
}

interface MapUserData {
  ownerId       : string  // the matrix user who is using the matrix-appservice-wechaty
  wechatyUserId : string  // the wechaty contact id that this user linked to
}

interface DirectMessageUserPair {
  user    : MatrixUser,
  service : MatrixUser,
}

const APPSERVICE_NAME_POSTFIX = '(Wechaty Bridged)'

const MAP_ROOM_DATA_KEY = 'wechatyBridgeRoom'
const MAP_USER_DATA_KEY = 'wechatyBridgeUser'

export class MapManager {

  private wechatyManager!: WechatyManager
  private appserviceManager!: AppserviceManager

  constructor () {
  }

  setManager (managers: {
    wechatyManager    : WechatyManager,
    appserviceManager : AppserviceManager,
  }) {
    this.wechatyManager    = managers.wechatyManager
    this.appserviceManager = managers.appserviceManager
  }

  public async matrixUser (wechatyUser: WechatyUser) : Promise<MatrixUser>
  public async matrixUser (matrixUserId: string)     : Promise<MatrixUser>

  public async matrixUser (
    user: string | WechatyUser,
  ): Promise<MatrixUser> {
    log.verbose('MapManager', 'matrixUser(%s)', user)

    if (typeof user === 'string') {
      const matrixUser = await this.appserviceManager.userStore.getMatrixUser(user)
      if (matrixUser) {
        return matrixUser
      }
      throw new Error(`matrix user id ${user} not found in store`)
    }

    const wechaty = user.wechaty
    const ownerId = this.wechatyManager.matrixOwnerId(wechaty)

    const userData: MapUserData = {
      ownerId,
      wechatyUserId: user.id,
    }

    const query = this.appserviceManager.storeQuery(
      MAP_USER_DATA_KEY,
      userData,
    )

    const matrixUserList = await this.appserviceManager.userStore
      .getByMatrixData(query)

    const matrixUser = matrixUserList.length > 0
      ? matrixUserList[0]
      : this.generateMatrixUser(user, userData)

    return matrixUser
  }

  /**
   * Get a Wechaty User from:
   *  1. Direct Message Room, or
   *  2. Matrix User.
   */
  public async wechatyUser (
    roomOrUser: MatrixRoom | MatrixUser,
  ): Promise<WechatyUser> {
    log.verbose('MapManager', 'wechatyUser(%s)', roomOrUser)

    let matchKey: string

    if (roomOrUser instanceof MatrixRoom) {
      matchKey = MAP_ROOM_DATA_KEY
    } else if (roomOrUser instanceof MatrixUser) {
      matchKey = MAP_USER_DATA_KEY
    } else {
      throw new Error('unknown args')
    }

    const data = {
      ...roomOrUser.get(matchKey),
    } as Partial<MapUserData>

    if (!data.ownerId) {
      throw new Error('no owner id for matrix room ' + roomOrUser.getId())
    }
    if (!data.wechatyUserId) {
      throw new Error('no wechaty user id for matrix room ' + roomOrUser.getId())
    }

    const ownerId       = data.ownerId
    const wechatyUserId = data.wechatyUserId

    const wechaty = this.wechatyManager.wechaty(ownerId)
    if (!wechaty) {
      throw new Error('no wechaty instance for matrix user id ' + ownerId)
    }

    const wechatyContact = await wechaty.Contact
      .find({ id: wechatyUserId })

    if (!wechatyContact) {
      throw new Error('no wechaty contact found for id: ' + wechatyUserId)
    }
    return wechatyContact
  }

  /**
   * Group Room
   */
  public async matrixRoom (wechatyRoom: WechatyRoom): Promise<MatrixRoom>
  /**
   * Direct Message Room
   */
  public async matrixRoom (wechatyUser: WechatyUser): Promise<MatrixRoom>

  public async matrixRoom (
    wechatyUserOrRoom: WechatyUser | WechatyRoom,
  ): Promise<MatrixRoom> {
    log.verbose('MapManager', 'matrixRoom(%s)', wechatyUserOrRoom)

    const ownerId = this.wechatyManager.matrixOwnerId(wechatyUserOrRoom.wechaty)

    const data = { ownerId } as MapRoomData

    if (wechatyUserOrRoom instanceof WechatyUser) {
      const matrixUser = await this.matrixUser(wechatyUserOrRoom)
      data.matrixUserId = matrixUser.getId()
    } else if (wechatyUserOrRoom instanceof WechatyRoom) {
      data.wechatyRoomId = wechatyUserOrRoom.id
    } else {
      throw new Error('unknown args')
    }

    const query = this.appserviceManager.storeQuery(
      MAP_ROOM_DATA_KEY,
      data,
    )

    const entryList = await this.appserviceManager.roomStore
      .getEntriesByMatrixRoomData(query)

    const matrixRoom = entryList.length > 0
      ? entryList[0].matrix
      : await this.generateMatrixRoom(wechatyUserOrRoom, data)

    if (!matrixRoom) {
      throw new Error('get matrix room failed')
    }
    return matrixRoom
  }

  public async wechatyRoom (
    room: MatrixRoom,
  ): Promise<WechatyRoom> {
    log.verbose('MapManager', 'wechatyRoom(%s)', room.getId())

    const {
      ownerId,
      wechatyRoomId,
    } = {
      ...room.get(MAP_ROOM_DATA_KEY),
    } as MapRoomData

    if (!wechatyRoomId) {
      throw new Error('no wechaty room id for matrix room ' + room.getId())
    }
    if (!ownerId) {
      throw new Error('no owner id for matrix room ' + room.getId())
    }

    const wechaty = this.wechatyManager.wechaty(ownerId)
    if (!wechaty) {
      throw new Error('no wechaty instance for matrix user id ' + room.getId())
    }

    const wechatyRoom = await wechaty.Room
      .find({ id: wechatyRoomId })
    if (!wechatyRoom) {
      throw new Error('no wechaty room found for id: ' + wechatyRoomId)
    }
    return wechatyRoom
  }

  protected async generateMatrixUser (
    wechatyUser : WechatyUser,
    userData    : MapUserData,
  ): Promise<MatrixUser> {
    log.verbose('MapManager', 'generateMatrixUser(%s, "%s")',
      wechatyUser.id,
      JSON.stringify(userData),
    )

    const matrixUserId = this.appserviceManager.generateVirtualUserId()
    const matrixUser   = new MatrixUser(matrixUserId)

    // userData.name   = wechatyUser.name() + APPSERVICE_NAME_POSTFIX

    matrixUser.set(MAP_USER_DATA_KEY, userData)
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)

    return matrixUser
  }

  /**
   * Room: Group Room
   * User: Direct Message Room
   */
  protected async generateMatrixRoom (
    wechatyRoomOrUser : WechatyRoom | WechatyUser,
    roomData          : MapRoomData,
  ): Promise<MatrixRoom> {
    log.verbose('MapManager', 'generateMatrixRoom(%s, %s)',
      wechatyRoomOrUser,
      JSON.stringify(roomData),
    )

    const wechaty = wechatyRoomOrUser.wechaty
    const ownerId = this.wechatyManager.matrixOwnerId(wechaty)

    const inviteeIdList = [ ownerId ]
    let   roomName: string

    if (wechatyRoomOrUser instanceof WechatyRoom) {
      // Room: group
      roomName = await wechatyRoomOrUser.topic()
      for await (const member of wechatyRoomOrUser) {
        const matrixUser = await this.matrixUser(member)
        inviteeIdList.push(matrixUser.getId())
      }
    } else if (wechatyRoomOrUser instanceof WechatyUser) {
      // User: direct message
      roomName = wechatyRoomOrUser.name()
      const matrixUser = await this.matrixUser(wechatyRoomOrUser)
      inviteeIdList.push(matrixUser.getId())
    } else {
      throw new Error('unknown args')
    }

    const matrixRoom = await this.createGroupRoom(inviteeIdList, roomName)

    matrixRoom.set(MAP_ROOM_DATA_KEY, roomData)
    await this.appserviceManager.roomStore.setMatrixRoom(matrixRoom)

    return matrixRoom
  }

  /**
   * The group room will be created by the bot itself.
   */
  protected async createGroupRoom (
    matrixUserIdList : string[],
    topic            : string,
  ): Promise<MatrixRoom> {
    log.verbose('MapManager', 'createGroupRoom([%s], %s)',
      matrixUserIdList.join(','),
      topic,
    )

    // use bot intent to create a group room
    const intent = this.appserviceManager.bridge.getIntent()

    const roomInfo = await intent.createRoom({
      createAsClient: false,
      options: {
        invite     : matrixUserIdList,
        name       : topic + APPSERVICE_NAME_POSTFIX,
        visibility : 'private',
      },
    })

    const matrixRoom = new MatrixRoom(roomInfo.room_id)
    return matrixRoom
  }

  public async setDirectMessageRoom (
    args: {
      matrixUser : MatrixUser,
      owner      : MatrixUser,
      matrixRoom : MatrixRoom,
    }
  ) {
    log.verbose('MapManager', 'DirectMessageRoom({ownerId: %s, matrixUserId: %s, matrixRoomId: %s})',
      args.matrixUser.getId(),
      args.owner.getId(),
      args.matrixRoom.getId(),
    )

    const data: MapRoomData = {
      ...args.matrixRoom.get(MAP_ROOM_DATA_KEY),
      matrixUserId : args.matrixUser.getId(),
      ownerId      : args.owner.getId(),
    }

    args.matrixRoom.set(
      MAP_ROOM_DATA_KEY,
      data,
    )
    await this.appserviceManager.roomStore.setMatrixRoom(args.matrixRoom)
  }

  public async isDirectMessageRoom (
    matrixRoom: MatrixRoom,
  ): Promise<boolean> {
    log.verbose('MapManager', 'isDirectMessageRoom(%s)', matrixRoom.getId())

    const {
      matrixUserId,
    } = {
      ...matrixRoom.get(MAP_ROOM_DATA_KEY),
    } as Partial<MapRoomData>

    const isDM = !!matrixUserId

    log.silly('MapManager', 'isDirectMessageRoom() -> %s', isDM)
    return isDM
  }

  public async directMessageUserPair (
    matrixRoom: MatrixRoom,
  ): Promise<DirectMessageUserPair> {
    log.verbose('MapManager', 'directMessageUserPair(%s)', matrixRoom.getId())

    const {
      ownerId,
      matrixUserId,
    } = {
      ...matrixRoom.get(
        MAP_ROOM_DATA_KEY
      ),
    } as MapRoomData
    if (!matrixUserId) {
      throw new Error('no matrix user id found)')
    }

    const service = await this.matrixUser(matrixUserId)
    const user    = await this.matrixUser(ownerId)

    return {
      service,
      user,
    }
  }

}

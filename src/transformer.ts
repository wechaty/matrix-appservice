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
}           from './config'
import { WechatyManager } from './wechaty-manager'
import { AppserviceManager } from './appservice-manager'

/**
 * 
# AppserviceMatrixRoomData

AppServiceManager::matrixRoomOfWechatyRoom
AppServiceManager::directMessage
AppServiceManager::createDirectRoom
AppServiceManager::generateMatrixRoom
AppServiceManager::storeQuery

SuperEvent::DirectmessageUserPair
SuperEvent::isDirectMessage

WechatyManager::wechatyRoom

# AppserviceMatrixUserData

AppServiceManager::matrixUserOfContact
AppServiceManager::directMessageRoom

WechatyManager::wechatyContact
 */
interface MatchRoomData {
  ownerId : string   // the matrix user id who is using the matrix-appservice-wechaty

  /**
   * 1 or 2:
   *  directUserId & wechatyRoomId should only be set one, and leave the other one to be undefined.
   */
  
  /*
   * 1. If wechatyUserId is set, then this room is a direct message room, between the ownerId and wechatyUserId
   */
  wechatyUserId? : string // for a direct message room (user to user private message, exactly 2 people)
  /**
   * 2. If wechatyRoomId is set, then this room is a group room, linked to the wechatyRoomId as well.
   */
  wechatyRoomId? : string // for a group room (not direct message, >2 people)
}

interface MatchUserData {
  ownerId       : string  // the matrix user who is using the matrix-appservice-wechaty
  wechatyUserId : string  // the wechaty contact id that this user linked to
}

const APPSERVICE_NAME_POSTFIX = '(Wechaty Bridged)'
const APPSERVICE_DATA_KEY     = 'wechatyBridge'

const MATCH_ROOM_DATA_KEY    = 'wechatyBridgeRoom'
const MATCH_USER_DATA_KEY    = 'wechatyBridgeUser'

 export class Transformer {

  constructor (
    public wechatyManager: WechatyManager,
    public appserviceManager: AppserviceManager,
  ) {

  }

  public async matrixUser (
    user: WechatyUser,
  ): Promise<MatrixUser> {
    log.verbose('Transformer', 'matrixUser(%s)', user)

    const wechaty = user.wechaty
    const ownerId = this.wechatyManager.matrixOwnerId(wechaty)

    const userData: MatchUserData = {
      ownerId,
      wechatyUserId: user.id,
    }

    const query = this.storeQuery(
      MATCH_USER_DATA_KEY,
      userData,
    )

    const matrixUserList = await this.appserviceManager.userStore
      .getByMatrixData(query)

    const matrixUser = matrixUserList.length > 0
      ? matrixUserList[0]
      : this.generateMatrixUser(user, userData)

    return matrixUser
  }

  public async wechatyUser (
    roomOrUser: MatrixRoom | MatrixUser,
  ): Promise<WechatyUser> {
    log.verbose('Transformer', 'wechatyUser(%s)', roomOrUser)

    let matchKey: string

    if (roomOrUser instanceof MatrixRoom) {
      matchKey = MATCH_ROOM_DATA_KEY
    } else if (roomOrUser instanceof MatrixUser) {
      matchKey = MATCH_USER_DATA_KEY
    } else {
      throw new Error('unknown args')
    }

    const data = {
      ...roomOrUser.get(matchKey),
    } as Partial<MatchUserData>

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
    log.verbose('Transformer', 'matrixRoom(%s)', wechatyUserOrRoom)

    const ownerId = this.wechatyManager.matrixOwnerId(wechatyUserOrRoom.wechaty)
    
    const data = { ownerId } as MatchRoomData

    if (wechatyUserOrRoom instanceof WechatyUser) {
      data.wechatyUserId = wechatyUserOrRoom.id
    } else if (wechatyUserOrRoom instanceof WechatyRoom) {
      data.wechatyRoomId = wechatyUserOrRoom.id
    } else {
      throw new Error('unknown args')
    }

    const query = this.storeQuery(
      MATCH_ROOM_DATA_KEY,
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
    log.verbose('Transformer', 'wechatyRoom(%s)', room.getId())

    const {
      ownerId,
      wechatyRoomId,
    } = {
      ...room.get(MATCH_ROOM_DATA_KEY),
    } as MatchRoomData

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

  protected storeQuery (
    dataKey    : string,
    filterData : MatchUserData | MatchRoomData,
  ): {
    [key: string]: string,
  } {
    log.verbose('Transformer', 'storeQuery(%s, "%s")',
      dataKey,
      JSON.stringify(filterData),
    )

    const query = {} as { [key: string]: string }

    for (let [key, value] of Object.entries(filterData)) {
      query[`${dataKey}.${key}`] = value
    }

    return query
  }

  protected async generateMatrixUser (
    wechatyUser : WechatyUser,
    userData    : MatchUserData,
  ): Promise<MatrixUser> {
    log.verbose('Transformer', 'generateMatrixUser(%s, "%s")',
      wechatyUser.id,
      JSON.stringify(userData),
    )

    const matrixUserId = this.appserviceManager.generateVirtualUserId()
    const matrixUser   = new MatrixUser(matrixUserId)

    // userData.name   = wechatyUser.name() + APPSERVICE_NAME_POSTFIX

    matrixUser.set(MATCH_USER_DATA_KEY, userData)
    await this.appserviceManager.userStore.setMatrixUser(matrixUser)

    return matrixUser
  }

  /**
   * Room: Group Room
   * User: Direct Message Room
   */
  protected async generateMatrixRoom (
    wechatyRoomOrUser : WechatyRoom | WechatyUser,
    roomData          : MatchRoomData,
  ): Promise<MatrixRoom> {
    log.verbose('Transformer', 'generateMatrixRoom(%s, %s)',
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
    } else {
      // User: direct message
      roomName = wechatyRoomOrUser.name()
      const matrixUser = await this.matrixUser(wechatyRoomOrUser)
      inviteeIdList.push(matrixUser.getId())
    }

    const matrixRoom = await this.createGroupRoom(inviteeIdList, roomName)

    matrixRoom.set(MATCH_ROOM_DATA_KEY, roomData)
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
    log.verbose('Transformer', 'createGroupRoom([%s], %s)',
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

  public async isDirectMessageRoom (
    matrixRoom: MatrixRoom,
  ): Promise<boolean> {
    log.verbose('Transformer', 'isDirectMessageRoom(%s)', matrixRoom.getId())

    const { 
      wechatyUserId,
    } = {
      ...matrixRoom.get(MATCH_ROOM_DATA_KEY)
    } as Partial<MatchRoomData>

    const isDM = !!wechatyUserId

    log.silly('Transformer', 'isDirectMessage() -> %s', isDM)
    return isDM
  }


  public isEnabled (matrixUser: MatrixUser): boolean {
    log.verbose('AppserviceManager', 'isEnabled(%s)', matrixUser.getId())

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
    } as AppserviceWechatyData

    const enabled = !!wechatyData.enabled
    log.silly('AppserviceManager', 'isEnable(%s) -> %s', matrixUser.getId(), enabled)
    return !!enabled
  }

  public async enable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'enable(%s)', matrixUser.getId())

    if (this.isEnabled(matrixUser)) {
      throw new Error(`matrixUserId ${matrixUser.getId()} has already enabled`)
    }

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
      enabled: true,
    } as AppserviceWechatyData

    matrixUser.set(
      APPSERVICE_WECHATY_DATA_KEY,
      wechatyData,
    )
    await this.userStore.setMatrixUser(matrixUser)
  }

  public async disable (matrixUser: MatrixUser): Promise<void> {
    log.verbose('AppserviceManager', 'disable(%s)', matrixUser.getId())

    const wechatyData = {
      ...matrixUser.get(
        APPSERVICE_WECHATY_DATA_KEY
      ),
      enabled: false,
    } as AppserviceWechatyData

    matrixUser.set(
      APPSERVICE_WECHATY_DATA_KEY,
      wechatyData,
    )
    await this.userStore.setMatrixUser(matrixUser)
  }

}
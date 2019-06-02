declare module 'matrix-appservice-bridge' {
  type Controller = any

  type MatrixClient = any

  type MembershipState = 'joined' | 'join' | 'leave' | string

  // FIXME: declare it in the right way
  const AppServiceRegistration = {
    generateToken: () => string
  }

  //////////////////

  interface BridgeOptions {
    homeserverUrl: string
    domain: string
    registration: string
    controller: Controller
  }

  interface BridgeConfig {
    schema: string,
  }

  interface CliOptions {
    bridgeConfig?        : BridgeConfig,
    enableRegistration?  : boolean,
    enableLocalpart?     : boolean,
    generateRegistration : (reg: any, callback: (r: any) => void) => void,
    port                 : number,
    registrationPath?    : string,
    run                  : (port: number, config: any) => void,
  }

  ///////////////////////////////////////////////////////////////////////
  // FIXME: find the official name for this structure
  interface UserMap {
    [id: string]: {
      display_name: string,
      avatar_url: string,
    }
  }
  interface RemoteRoomMap {
    [id: string]: RemoteRoom
  }
  interface RoomBridgeStoreEntryMap {
    [id: string]: Array<RoomBridgeStoreEntry>
  }
  // FIXME: END
  ////////////////////////////////

  interface RoomInfo {
    id                : string         //	The matrix room ID
    state             : Array[object]  //	The raw state events for this room
    realJoinedUsers   : Array<string>  //  A list of user IDs of real matrix users that have joined this room.
    remoteJoinedUsers : Array<string>  //  A list of
  }

  interface RoomBridgeStoreEntry {
    id        : string             //  The unique ID for this entry.
    matrix_id : string             // "room_id",
    remote_id : string             // "remote_room_id",
    matrix    : null | MatrixRoom  //	<nullable> The matrix room, if applicable.
    remote    : null | RemoteRoom  // <nullable> The remote room, if applicable.
    data      : null | object      //  <nullable> Information about this mapping, which may be an empty.
  }

  //////////////////

  class AppServiceBot {
    constructor (client: MatrixClient, registration: AppServiceRegistration, memberCache: MembershipCache)
    getJoinedMembers(roomId: string): Promise<UserMap>
    getJoinedRooms(): Promise<Array<string>>
    isRemoteUser(userId: string): boolean

  }

  class Bridge {
    constructor (options: BridgeOptions)
    run (port: number, config: any)
    getIntent (id: string): Intent
  }

  class Cli {
    constructor (options: CliOptions)
    run (): void
    getConfig(): null | object
    getRegistrationFilePath(): string
    generateRegistration(reg: AppServiceRegistration, callback: function): void
    runBridge(port: number, config: null | object, reg: AppServiceRegistration): void
  }

  class Intent {
    constructor (client: MatrixClient, botClient: MatrixClient, opts: object)
    ban(roomId: string, target: string, reason: string): Promise<void>
    createAlias(alias: string, roomId: string): Promise<void>
    createRoom(opts: object): Promise<void>
    getClient(): MatrixClient
    getEvent(roomId: string, eventId: string, useCache?: boolean): Promise<any>
    getProfileInfo(userId: string, info: string, useCache?: boolean): Promise<any>
    getStateEvent(roomId: string, eventType: string, stateKey?: string): Promise<any>
    invite(roomId: string, target: string): Promise<void>
    join(roomId: string, viaServers: string[]): Promise<void>
    kick(roomId: string, target: string, reason: string): Promise<void>
    leave(roomId: string): Promise<void>
    onEvent(event: object): void
    roomState(roomId: string, useCache?: boolean): Promise<any>
    sendEvent(roomId: string, type: string, content: object): Promise<void>
    sendMessage(roomId: string, content: object): Promise<void>
    sendReadReceipt(): Promise<void>
    sendStateEvent(roomId: string, type: string, skey: string, content: object): Promise<void>
    sendText(roomId: string, text: string): Promise<void>
    sendTyping(roomId: string, isTyping: boolean): Promise<void>
    setAvatarUrl(url: string): Promise<void>
    setDisplayName(name: string): Promise<void>
    setPowerLevel(roomId: string, target: string, level: number): Promise<void>
    setPresence(presence: 'online' | 'offline' | 'unavailable', status_msg:string): Promise<void>
    setRoomAvatar(roomId: string, avatar: string, info: string): Promise<void>
    setRoomName(roomId: string, name: string): Promise<void>
    setRoomTopic(roomId: string, topic: string): Promise<void>
    unban(roomId: string, target: string): Promise<void>
  }

  class MatrixRoom {
    constructor (roomId: string)
    deserialize(data: object): void
    get(key: string): undefined | object
    getId(): string
    serialize(): object
    set(key: string, val: object): void
  }

  class MatrixUser {
    constructor (userId: string, dataopt?: object, escape = true)
    escapeUserId()
    get(key: string): undefined | object
    getDisplayName(): null | string
    getId(): string
    serialize(): object
    set(key: string, val: object): void
    setDisplayName(name: string): void
  }

  class RemoteRoom {
    constructor (identifier: string, dataopt?: object)
    get(key: string): undefined | object
    getId(): string
    serialize(): object
    set(key: string, val: object): void
  }

  class RemoteUser {
    constructor (identifier: string, dataopt?: object)
    get(key: string): undefined | object
    getId(): string
    serialize(): object
    set(key: string, val: object): void
  }

  class RoomBridgeStore {
    constructor (db: Datastore, ops: object)
    batchGetLinkedRemoteRooms(matrixIds: Array<string>): RemoteRoomMap
    getEntriesByLinkData(data: object): Array<RoomBridgeStoreEntry>
    getEntriesByMatrixId(matrixId: string): Array<RoomBridgeStoreEntry>
    getEntriesByMatrixIds(ids: Array<string>): Promise<RoomBridgeStoreEntryMap>
    getEntriesByMatrixRoomData(data: object): Array<RoomBridgeStoreEntry>
    getEntriesByRemoteId(remoteId: string): Array<RoomBridgeStoreEntry>
    getEntriesByRemoteRoomData(data: object): Array<RoomBridgeStoreEntry>
    getEntryById(id: string): Promise<null | RoomBridgeStoreEntry>
    getLinkedMatrixRooms(remoteId: string): Array<MatrixRoom>
    getLinkedRemoteRooms(matrixId: string): Array<RemoteRoom>
    getMatrixRoom(roomId: string): null | MatrixRoom
    linkRooms(matrixRoom: MatrixRoom, remoteRoom: RemoteRoom, data?: object, linkId?: string): Promise<void>
    removeEntriesByLinkData(data: object): Promise<void>
    removeEntriesByMatrixRoomData(data: object): Promise<void>
    removeEntriesByMatrixRoomId(matrixId: string): Promise<void>
    removeEntriesByRemoteRoomData(data: object): Promise<void>
    removeEntriesByRemoteRoomId(remoteId: string): Promise<void>
    setMatrixRoom(matrixRoom: MatrixRoom): Promise<void>
    upsertEntry(entry: RoomBridgeStoreEntry): Promise<void>
  }

  class MembershipCache {
    constructor ()
    getMemberEntry(roomId: string, userId: string): MembershipState
    setMemberEntry(roomId: string, userId: string, membership: MembershipState)

  }

  class UserBridgeStore {
    constructor (db: Datastore, opts: object)
    getByMatrixData(dataQuery: object): Promise<Array<MatrixUser>>
    getByMatrixLocalpart(localpart: string): Promise<null | MatrixUser>
    getByRemoteData(dataQuery: object): Promise<Array<RemoteUser>>
    getMatrixLinks(remoteId: string): Promise<Array<String>>
    getMatrixUser(userId: string): Promise<null | MatrixUser>
    getMatrixUsersFromRemoteId(remoteId: string): Promise<Array<MatrixUser>>
    getRemoteLinks(matrixId: string): Promise<Array<String>>
    getRemoteUser(id: string): Promise<null | RemoteUser>
    getRemoteUsersFromMatrixId(userId: string): Promise<Array<RemoteUser>>
    linkUsers(matrixUser: MatrixUser, remoteUser: RemoteUser): Promise<void>
    setMatrixUser(matrixUser: MatrixUser): Promise<void>
    setRemoteUser(remoteUser: RemoteUser): Promise<void>
    unlinkUserIds(matrixUserId: string, remoteUserId: string): Promise<number>
    unlinkUsers(matrixUser: MatrixUser, remoteUser: RemoteUser): Promise<number>
  }

}

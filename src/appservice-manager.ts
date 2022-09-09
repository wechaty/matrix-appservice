import cuid from 'cuid'
import type { ReadStream } from 'fs'

import {
  Bridge,
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  MatrixRoom,
  AppServiceRegistration,
  FileUploadOpts,
}                       from 'matrix-appservice-bridge'

import * as PUPPET from 'wechaty-puppet'
import type { Message } from 'wechaty'

import {
  log,
}                       from './config.js'
import {
  Manager,
  Managers,
}                         from './manager.js'
import type { Registration } from './registration.js'

export class AppserviceManager extends Manager {

  public bridge!    : Bridge
  public roomStore! : RoomBridgeStore
  public userStore! : UserBridgeStore

  public domain!    : string
  public localpart! : string

  constructor () {
    super()
    log.verbose('Appservicemanager', 'constructor()')
  }

  teamManager (managers: Managers) {
    // I'm the solo one!
    log.verbose('Appservicemanager', 'setManager(%s)', managers)
  }

  public setBridge (matrixBridge: Bridge): void {
    log.verbose('Appservicemanager', 'setBridge(bridge)')

    // if (this.bridge) {
    //   throw new Error('bridge can not be set twice!')
    // }

    this.bridge    = matrixBridge
    this.domain    = matrixBridge.opts.domain

    const registration = matrixBridge.opts.registration
    if (registration instanceof AppServiceRegistration) {
      this.localpart = (registration as AppServiceRegistration).getSenderLocalpart()!
    } else if (typeof registration === 'string') {
      this.localpart = matrixBridge.getBot().getUserId().split(':')[0]!.replace('@', '')
    } else {
      this.localpart = (registration as unknown as Registration).senderLocalpart!
    }

    const userBridgeStore = matrixBridge.getUserStore()
    const roomBridgeStore = matrixBridge.getRoomStore()

    if (!userBridgeStore) {
      throw new Error('can not get UserBridgeStore')
    }
    if (!roomBridgeStore) {
      throw new Error('can not get RoomBridgeStore')
    }
    this.roomStore = roomBridgeStore
    this.userStore = userBridgeStore
  }

  public appserviceUserId (): string {
    return [
      '@',
      this.localpart,
      ':',
      this.domain,
    ].join('')
  }

  public async appserviceUser (): Promise<MatrixUser> {
    const matrixUserId = this.appserviceUserId()
    const matrixUser = await this.userStore.getMatrixUser(matrixUserId)
    if (!matrixUser) {
      throw new Error('no matrix user from store for id ' + matrixUserId)
    }
    return matrixUser
  }

  /**
   * Huan(202002) - To be confirmed: isVirtual is not include isBot
   */
  public isVirtual (matrixUserId: string): boolean {
    return this.bridge.getBot()
      .isRemoteUser(matrixUserId)
  }

  public isBot (matrixUserId: string): boolean {
    const appserviceUserId = this.appserviceUserId()
    return appserviceUserId === matrixUserId
  }

  public isUser (matrixUserId: string): boolean {
    return !(
      this.isBot(matrixUserId)
        || this.isVirtual(matrixUserId)
    )
  }

  public async sendMessage (
    message   : string | Message,
    inRoom    : MatrixRoom,
    fromUser? : MatrixUser,
  ) {
    const text = typeof (message) === 'string' ? message : message.text()
    log.verbose('Appservicemanager', 'sendMessage(%s%s%s)',
      text.substr(0, 100),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      inRoom
        ? ', ' + inRoom.getId()
        : '',
      fromUser
        ? ', ' + fromUser.getId()
        : '',
    )

    const intent = this.bridge.getIntent(fromUser && fromUser.getId())

    if (typeof (message) !== 'string') {
      switch (message.type()) {
        case PUPPET.types.Message.Unknown:
          break
        case PUPPET.types.Message.Audio:
          break
        case PUPPET.types.Message.Contact: // image in ipad protocol is Emoticon
          break
        case PUPPET.types.Message.Emoticon: case PUPPET.types.Message.Image: case PUPPET.types.Message.Attachment:
        // image in web protocol is Image, in ipad protocol is Emoticon
          try {
            const file = await message.toFileBox()
            const buffer = await file.toBuffer()
            // XXX It is recommended to use a digital summary to construct the file name to avoid repeated uploads.
            // digital summary consuming too much computing resources, use the url to lable it is better.
            const url = await intent.uploadContent(buffer, {
              name: file.name,
              type: file.mediaType === 'emoticon' ? 'image/gif' : file.mediaType,
            })
            await intent.sendMessage(
              inRoom.getId(),
              {
                body: file.name,
                info: {},
                msgtype: message.type() === PUPPET.types.Message.Attachment ? 'm.file' : 'm.image',
                url: url,
              },
            )
          } catch (e) {
            log.error(`Appservicemanager', 'sendMessage() rejection from ${fromUser ? fromUser.getId() : 'BOT'} to room ${inRoom.getId()}`)
            throw e
          }
          return
      }
    }

    try {
      await intent.sendText(
        inRoom.getId(),
        text,
      )
    } catch (e) {
      log.error(`Appservicemanager', 'sendMessage() rejection from ${fromUser ? fromUser.getId() : 'BOT'} to room ${inRoom.getId()}`)
      throw e
    }
  }

  public generateVirtualUserId () {
    return [
      '@',
      this.localpart,
      '_',
      cuid(),
      ':',
      this.domain,
    ].join('')
  }

  public storeQuery (
    dataKey    : string,
    filterData : object,
  ): {
    [key: string]: string,
  } {
    log.verbose('Appservicemanager', 'storeQuery(%s, "%s")',
      dataKey,
      JSON.stringify(filterData),
    )

    const query = {} as { [key: string]: string }

    for (const [key, value] of Object.entries(filterData)) {
      query[`${dataKey}.${key}`] = value
    }

    return query
  }

  /**
   * The matrix room will be created by the specified creater.
   */
  public async createRoom (
    userIdList : string[],
    args: {
      creatorId? : string,
      name?      : string,
      topic?     : string,
    } = {},
  ): Promise<MatrixRoom> {
    log.verbose('Appservicemanager', 'createRoom(["%s"], "%s")',
      userIdList.join('","'),
      JSON.stringify(args),
    )

    const intent = this.bridge.getIntent(args.creatorId)

    /**
     * See:
     *  Issue #4 - https://github.com/wechaty/matrix-appservice-wechaty/issues/4
     *  Client Server API Spec - https://matrix.org/docs/spec/client_server/r0.6.0#id140
     *  https://github.com/matrix-org/matrix-js-sdk/issues/653#issuecomment-393371939
     */
    const roomInfo = await intent.createRoom({
      createAsClient: true,
      options: {
        invite     : userIdList,
        is_direct  : userIdList.length <= 2,
        name       : args.name,
        preset     : 'trusted_private_chat',
        topic      : args.topic,
        visibility : 'private',
      },

    })

    const matrixRoom = new MatrixRoom(roomInfo.room_id)
    for await (const userId of userIdList.slice(1)) {
      await this.bridge.getIntent(userId).join(matrixRoom.getId())
    }
    return matrixRoom
  }

  public async roomMembers (roomId: string): Promise<string[]> {
    const client = this.bridge.getClientFactory().getClientAs()
    const result = await client.getJoinedRoomMembers(roomId) as {
      joined: {
        [id: string]: {
          // eslint-disable-next-line camelcase
          avatar_url: null | string,
          // eslint-disable-next-line camelcase
          display_name: string,
        },
      }
    }

    // { joined:
    //   { '@huan:0v0.bid': { avatar_url: null, display_name: 'huan' },
    //     '@wechaty:0v0.bid': { avatar_url: null, display_name: 'wechaty' } } }
    return Object.keys(result.joined)
  }

  public async setProfile (userId: string, avataUrl: string, displayName: string): Promise<void> {
    const intent = this.bridge.getIntent(userId)
    await intent.setAvatarUrl(avataUrl)
    await intent.setDisplayName(displayName)
  }

  public async uploadContent (
    content: string | Buffer | ReadStream,
    userId?: string,
    opts?: FileUploadOpts | undefined,
  ): Promise<string> {
    return this.bridge.getIntent(userId).uploadContent(content, opts)
  }

  public async mxcUrlToHttp (
    mxcUrl: string,
  ): Promise<string> {
    // also can use getHttpUriForMxc(this.baseUrl, mxcUrl, width, height, resizeMethod, allowDirectLinks);
    return this.bridge.getIntent().client.mxcUrlToHttp(mxcUrl)
  }

}

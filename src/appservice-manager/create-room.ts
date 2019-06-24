import { Intent } from 'matrix-appservice-bridge'

import { log } from '../config'

export async function createDirectRoom (
  intent       : Intent,
  matrixUserId : string,
  name?        : string,
): Promise<string> {
  log.verbose('AppService', 'createDirectMessageRoom("%s", "%s", "%s")',
    intent.getClient().getUserId(),
    matrixUserId,
    name || '',
  )

  const roomInfo = await intent.createRoom({
    createAsClient: true,
    options: {
      preset: 'trusted_private_chat',
      is_direct: true,
      visibility: 'private',
      invite: [
        matrixUserId,
      ],
      name,
    },
  })

  return roomInfo.room_id
}

export async function createRoom (
  intent   : Intent,
  matrixIdList : string[],
  name?    : string,
  topic?   : string,
): Promise<string> {
  log.verbose('AppService', 'createRoom("%s", "[%s]", "%s", "%s")',
    intent.getClient().getUserId(),
    matrixIdList.join(','),
    name || '',
    topic || '',
  )

  const roomInfo = await intent.createRoom({
    createAsClient: true,
    options: {
      visibility: 'private',
      invite: matrixIdList,
      name,
      topic,
    },
  })

  return roomInfo.room_id
}

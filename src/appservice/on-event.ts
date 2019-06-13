import { getBridge } from './get-bridge'

export async function onEvent (
  request: any,
  context: any,
): Promise<void> {
  console.info('onEvent()', request, context)

  // FIXME:
  const ROOM_ID = 'xxx'

  const event = request.getData()
  // replace with your room ID
  if (event.type !== 'm.room.message' || !event.content || event.room_id !== ROOM_ID) {
    return
  }

  const username = event.user_id
  const text = event.content.body

  const bridge = getBridge()

  const intent = bridge.getIntent('@wechaty_' + username.replace(/^@/, ''))
  // intent.sendText(ROOM_ID, `I repeat: ${username} said ${text}`)
  await intent.sendText(username, `I repeat: you said ${text}`)
}

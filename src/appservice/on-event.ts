export function onEvent (
  request: any,
  context: any,
): void {
  console.log('onEvent()', request, context)

  const event = request.getData()
  // replace with your room ID
  if (event.type !== 'm.room.message' || !event.content || event.room_id !== ROOM_ID) {
      return
  }

  const username = event.user_id
  const text = event.content.body

  const intent = bridge.getIntent('@wechaty_' + username.replace(/^@/, ''))
  // intent.sendText(ROOM_ID, `I repeat: ${username} said ${text}`)
  intent.sendText(username, `I repeat: you said ${text}`)
}

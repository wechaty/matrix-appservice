import {
  Contact,
  log,
  Message,
  ScanStatus,
  Wechaty,
}             from 'wechaty'

export async function startWechaty (
  wechaty: Wechaty,
): Promise<void> {
  wechaty.on('scan',    onScan)
  wechaty.on('login',   onLogin)
  wechaty.on('logout',  onLogout)
  wechaty.on('message', onMessage)

  wechaty.start()
    .then(() => log.verbose('Bot', 'Starter Bot Started.'))
    .catch(e => log.error('Bot', e))
}

function onScan (
  qrcode: string,
  status: ScanStatus,
) {
  require('qrcode-terminal').generate(qrcode, { small: true })  // show qrcode on console

  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')

  const statusName = ScanStatus[status]
  log.info('Bot', '%s(%s) %s', statusName, status, qrcodeImageUrl)
}

function onLogin (user: Contact) {
  console.info(`${user} login`)
}

function onLogout (user: Contact) {
  console.info(`${user} logout`)
}

async function onMessage (msg: Message) {
  console.info(msg.toString())
}

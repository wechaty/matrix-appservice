import {
  Contact,
  log,
  Message,
  Wechaty,
}             from 'wechaty'

const bot = new Wechaty({
  profile: 'matrix',
})

bot.on('scan',    onScan)
bot.on('login',   onLogin)
bot.on('logout',  onLogout)
bot.on('message', onMessage)

bot.start()
.then(() => log.verbose('Bot', 'Starter Bot Started.'))
.catch(e => log.error('Bot', e))

function onScan (
  qrcode: string,
  status: number,
) {
  require('qrcode-terminal').generate(qrcode, { small: true })  // show qrcode on console

  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')

  log.info('Bot', '%s %s', status, qrcodeImageUrl)
}

function onLogin (user: Contact) {
  console.log(`${user} login`)
}

function onLogout (user: Contact) {
  console.log(`${user} logout`)
}

async function onMessage (msg: Message) {
  console.log(msg.toString())
}

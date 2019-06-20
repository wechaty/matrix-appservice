import {
  ScanStatus,
}             from 'wechaty'

import {
  log,
}             from '../../config'

import {
  BridgeUser,
}             from '..'

export async function onScan (
  this: BridgeUser,
  qrcode: string,
  status: ScanStatus,
): Promise<void> {
  require('qrcode-terminal').generate(qrcode, { small: true })  // show qrcode on console

  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')

  const statusName = ScanStatus[status]
  log.info('Bot', '%s(%s) %s', statusName, status, qrcodeImageUrl)

  await this.bridge.getIntent(null).sendText(
    this.matrixDirectMessageRoomID,
    `${statusName}(${status}) ${qrcodeImageUrl}`,
  )
}

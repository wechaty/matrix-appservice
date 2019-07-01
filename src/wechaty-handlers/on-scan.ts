import {
  ScanStatus,
  Wechaty,
}             from 'wechaty'

import {
  log,
}             from '../config'

import { AppserviceManager } from '../appservice-manager'

export async function onScan (
  this: Wechaty,
  qrcode: string,
  status: ScanStatus,
  matrixUserId: string,
  appserviceManager: AppserviceManager,
): Promise<void> {
  require('qrcode-terminal').generate(qrcode)  // show qrcode on console

  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')

  const statusName = ScanStatus[status]

  log.verbose('wechaty-handlers', 'on-scan onScan(%s,%s(%s), %s)',
    qrcodeImageUrl, statusName, status, matrixUserId)

  const matrixRoomId = await appserviceManager.directMessageRoomId(matrixUserId)

  await appserviceManager.botIntent.sendText(
    matrixRoomId,
    `Scan to login: ${qrcodeImageUrl}`,
  )

}

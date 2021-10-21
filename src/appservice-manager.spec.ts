#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import {
  RoomBridgeStore,
  UserBridgeStore,
}                     from 'matrix-appservice-bridge'

import Nedb from 'nedb'

import { AppserviceManager } from './appservice-manager.js'

const MOCK_DOMAIN = 'domain.tld'
const MOCK_LOCALPART = 'wechaty'

class AppserviceManagerMock extends AppserviceManager {

  override generateVirtualUserId () { return super.generateVirtualUserId() }

}

function getMockAppserviceManager () {
  const appserviceManager = new AppserviceManagerMock()

  const mockBridge = {
    getIntent: sinon.spy(),
    getRoomStore: () => new RoomBridgeStore(new Nedb()),
    getUserStore: () => new UserBridgeStore(new Nedb()),
    opts: {
      domain: MOCK_DOMAIN,
      registration: {
        sender_localpart: MOCK_LOCALPART,
      },
    },
  } as any

  appserviceManager.setBridge(mockBridge)
  return appserviceManager
}

test('generateVirtualUserId()', async t => {
  const appserviceManager = getMockAppserviceManager()

  const virtualId = appserviceManager.generateVirtualUserId()
  t.true(/^@wechaty_[^:]+:.+$/.test(virtualId), 'virtual id generator should match base rules')
})

#!/usr/bin/env ts-node

import { test }  from 'tstest'
import Sinon from 'sinon'
import { Registration } from './registration'

import {
  RoomBridgeStore,
  UserBridgeStore,
}                     from 'matrix-appservice-bridge'

import Nedb     from 'nedb'

import { AppserviceManager } from './appservice-manager'

const MOCK_DOMAIN = 'domain.tld'
const MOCK_LOCALPART = 'wechaty'

class AppserviceManagerMock extends AppserviceManager {

  public override generateVirtualUserId () { return super.generateVirtualUserId() }

}

function getMockAppserviceManager () {
  const appserviceManager = new AppserviceManagerMock()

  const myRegistration = new Registration(MOCK_LOCALPART)
  const mockBridge = {
    getIntent: Sinon.spy(),
    getRoomStore: () => new RoomBridgeStore(new Nedb()),
    getUserStore: () => new UserBridgeStore(new Nedb()),
    opts: {
      domain: MOCK_DOMAIN,
      registration: myRegistration,
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

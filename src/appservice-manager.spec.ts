#!/usr/bin/env ts-node

import { test }  from 'tstest'
import Sinon from 'sinon'

import {
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
  RemoteUser,
}                     from 'matrix-appservice-bridge'
import {
  WechatyOptions,
}                     from 'wechaty'

import Nedb     from 'nedb'

import { AppserviceManager } from './appservice-manager'

const MOCK_DOMAIN = 'domain.tld'

function getMockAppserviceManager () {
  const appserviceManager = new AppserviceManager()

  const mockBridge = {
    opts: {
      domain: MOCK_DOMAIN,
    },
    getIntent: Sinon.spy(),
    getUserStore: () => new UserBridgeStore(new Nedb()),
    getRoomStore: () => new RoomBridgeStore(new Nedb()),
  } as any

  appserviceManager.setBridge(mockBridge)
  return appserviceManager
}

test('smoke testing for enable() disable() isEnabled() matrixUserList()', async (t) => {
  const MATRIX_USER_ID1 = 'dummy_id1'
  const MATRIX_USER_ID2 = 'dummy_id2'

  const appserviceManager = getMockAppserviceManager()

  let matrixUserList = await appserviceManager.matrixUserList()
  t.equal(matrixUserList.length, 0, 'should get zero user with empty user store')

  const matrixUser1 = new MatrixUser(MATRIX_USER_ID1)
  const matrixUser2 = new MatrixUser(MATRIX_USER_ID2)
  await appserviceManager.userStore.setMatrixUser(matrixUser1)
  await appserviceManager.userStore.setMatrixUser(matrixUser2)

  t.equal(appserviceManager.isEnabled(matrixUser1), false, 'should be false before enable it')

  await appserviceManager.enable(matrixUser1)
  t.equal(appserviceManager.isEnabled(matrixUser1), true, 'should be true after enable it')

  await appserviceManager.disable(matrixUser1)
  t.equal(appserviceManager.isEnabled(matrixUser1), false, 'should be false after disable it')

  await appserviceManager.enable(matrixUser1)
  matrixUserList = await appserviceManager.matrixUserList()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 1, 'should get 1 enabled user in the list')

  await appserviceManager.enable(matrixUser2)
  matrixUserList = await appserviceManager.matrixUserList()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 2, 'should get 2 enabled user in the list after enable user 2')

  await appserviceManager.disable(matrixUser2)
  matrixUserList = await appserviceManager.matrixUserList()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 1, 'should get 1 enabled user in the list after disable user 2')

})

test('wechatyOptions()', async (t) => {
  const MATRIX_USER_ID = 'dummy_id'
  const EXPECTED_NAME  = 'expected_name'

  const EXPECTED_OPTIONS: WechatyOptions = {
    name: EXPECTED_NAME,
  }

  const appserviceManager = getMockAppserviceManager()

  const matrixUser = new MatrixUser(MATRIX_USER_ID)

  let option = appserviceManager.wechatyOptions(matrixUser)
  t.deepEqual(option, {}, 'should get empty option before set')

  await appserviceManager.wechatyOptions(matrixUser, EXPECTED_OPTIONS)
  option =  appserviceManager.wechatyOptions(matrixUser)
  // console.info(option)
  t.deepEqual(option, EXPECTED_OPTIONS, 'should get expected option after set')
})

test('contactToRemoteId()', async t => {
  const ADMIN_ID         = `@admin_id:${MOCK_DOMAIN}`
  const CONTACT_ID       = 'contact_id'
  const EXPECT_REMOTE_ID = `@admin_id:${MOCK_DOMAIN}<->contact_id`

  const matrixAdmin = new MatrixUser(ADMIN_ID)

  const appserviceManager = getMockAppserviceManager()

  const remoteId = appserviceManager.contactToRemoteId(CONTACT_ID, matrixAdmin)
  t.equal(remoteId, EXPECT_REMOTE_ID, 'should get remote id right')
})

test('remoteToContactId()',  async t => {
  const REMOTE_ID         = 'admin_id<->contact_id'
  const EXPECT_CONTACT_ID = 'contact_id'

  const remoteUser = new RemoteUser(REMOTE_ID)

  const appserviceManager = getMockAppserviceManager()

  const contactId = appserviceManager.remoteToContactId(remoteUser)
  t.equal(contactId, EXPECT_CONTACT_ID, 'should get contact id right')
})

test('contactToGhostId() v.s. ghostToContactId()', async t => {
  const ADMIN_ID         = '@admin_id:domain.tld'
  const CONTACT_ID       = 'contact_id'

  const matrixAdmin = new MatrixUser(ADMIN_ID)

  const appserviceManager = getMockAppserviceManager()

  const remoteId = appserviceManager.contactToRemoteId(CONTACT_ID, matrixAdmin)
  const remoteUser = new RemoteUser(remoteId)
  const contactId = appserviceManager.remoteToContactId(remoteUser)

  t.equal(contactId, CONTACT_ID, 'should get contact id to remote id and get back')
})

test('generateGhostUserId()', async t => {
  const appserviceManager = getMockAppserviceManager()

  const ghostId = appserviceManager.generateGhostUserId()
  t.true(/^@wechaty_[^:]+:.+$/.test(ghostId), 'ghost id generator should match base rules')
})

#!/usr/bin/env ts-node

import { test }  from 'tstest'
import Sinon from 'sinon'

import {
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
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
    getIntent: Sinon.spy(),
    getRoomStore: () => new RoomBridgeStore(new Nedb()),
    getUserStore: () => new UserBridgeStore(new Nedb()),
    opts: {
      domain: MOCK_DOMAIN,
    },
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

test('generateVirtualUserId()', async t => {
  const appserviceManager = getMockAppserviceManager()

  const virtualId = appserviceManager.generateVirtualUserId()
  t.true(/^@wechaty_[^:]+:.+$/.test(virtualId), 'virtual id generator should match base rules')
})

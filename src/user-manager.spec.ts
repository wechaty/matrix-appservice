#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}                   from 'tstest'

import {
  MatrixUser,
  RoomBridgeStore,
  UserBridgeStore,
}                     from 'matrix-appservice-bridge'
import type {
  WechatyOptions,
}                     from 'wechaty'

import { UserManager } from './user-manager.js'

import Nedb     from 'nedb'

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

test('smoke testing for enable() disable() isEnabled() listist()', async t => {
  const MATRIX_USER_ID1 = 'dummy_id1'
  const MATRIX_USER_ID2 = 'dummy_id2'

  const userManager = new UserManager()

  userManager.teamManager({
    appserviceManager: getMockAppserviceManager(),
  })

  let matrixUserList = await userManager.list()
  t.equal(matrixUserList.length, 0, 'should get zero user with empty user store')

  const matrixUser1 = new MatrixUser(MATRIX_USER_ID1)
  const matrixUser2 = new MatrixUser(MATRIX_USER_ID2)
  await userManager.appserviceManager.userStore.setMatrixUser(matrixUser1)
  await userManager.appserviceManager.userStore.setMatrixUser(matrixUser2)

  t.equal(userManager.isEnabled(matrixUser1), false, 'should be false before enable it')

  await userManager.enable(matrixUser1)
  t.equal(userManager.isEnabled(matrixUser1), true, 'should be true after enable it')

  await userManager.disable(matrixUser1)
  t.equal(userManager.isEnabled(matrixUser1), false, 'should be false after disable it')

  await userManager.enable(matrixUser1)
  matrixUserList = await userManager.list()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 1, 'should get 1 enabled user in the list')

  await userManager.enable(matrixUser2)
  matrixUserList = await userManager.list()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 2, 'should get 2 enabled user in the list after enable user 2')

  await userManager.disable(matrixUser2)
  matrixUserList = await userManager.list()
  // console.info(matrixUserList)
  t.equal(matrixUserList.length, 1, 'should get 1 enabled user in the list after disable user 2')

})

test('wechatyOptions()', async (t) => {
  const MATRIX_USER_ID = 'dummy_id'
  const EXPECTED_NAME  = 'expected_name'

  const EXPECTED_OPTIONS: WechatyOptions = {
    name: EXPECTED_NAME,
  }

  const userManager = new UserManager()

  userManager.teamManager({
    appserviceManager: getMockAppserviceManager(),
  })

  const matrixUser = new MatrixUser(MATRIX_USER_ID)

  let option = userManager.wechatyOptions(matrixUser)
  t.deepEqual(option, {}, 'should get empty option before set')

  await userManager.wechatyOptions(matrixUser, EXPECTED_OPTIONS)
  option =  userManager.wechatyOptions(matrixUser)
  // console.info(option)
  t.deepEqual(option, EXPECTED_OPTIONS, 'should get expected option after set')
})

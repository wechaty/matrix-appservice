import dotenv         from 'dotenv'

dotenv.config()
export {
  createCli,
  checkUpdate,
}               from './cli/'

export {
  log,
  VERSION,
}               from './config'

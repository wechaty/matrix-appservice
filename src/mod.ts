import dotenv         from 'dotenv'

dotenv.config()
export {
  createCli,
  checkUpdate,
}               from './cli/mod.js'

export {
  log,
  VERSION,
}               from './config.js'

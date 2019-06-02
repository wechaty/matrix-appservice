#!/usr/bin/env node

import { ArgumentParser }   from 'argparse'
import pkgUp                from 'pkg-up'
import { UpdateNotifier }   from 'update-notifier'

import {
  getCli,
  log,
  VERSION,
}             from '../src/'

async function checkUpdate () {
  const pkgFile   = await pkgUp()
  if (!pkgFile) {
    throw new Error('package.json not found!')
  }

  const pkg       = require(pkgFile)
  const notifier  = new UpdateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
  })
  notifier.notify()
}

function assertNever (obj: never): never {
  throw new Error('Unexpected object: ' + obj)
}

async function main (args: Args): Promise<number> {
  log.level(args.log as any)
  log.timestamp(false)

  log.verbose('MatrixAppserviceWechaty', `v${VERSION}`)

  checkUpdate().catch(console.error)

  const cli = getCli()
  cli.run()

  const command  = args.commands[0]
  const pathname = args.commands[1]

  try {
    switch (command) {
      case 'register':
        await cli.register()
        break

      case 'run':
        await cli.run()
        break

      default:
        assertNever(command)
    }
    return 0
  } catch (e) {
    log.error('ManagerCli', 'Exception: %s', e)
    console.error(e)
    return 1
  }
}

type Command =    'register'
                | 'run'

interface Args {
  commands: [
    Command,
    string    // path
  ],
  log : string
}

function parseArguments (): Args {
  const parser = new ArgumentParser({
    addHelp     : true,
    description : 'Matrix AppService Wechaty',
    version     : VERSION,
  })

  parser.addArgument(
    [ 'commands' ],
    {
      defaultValue: ['blessed'],
      help: `
        align:      align the photo
        embedding:  calculate the embedding of photo
        visualize:  visualize the face box & embedding distance between faces
        validate:   validate on LFW dataset
        sort:       save photos to seprate directories based on identification.
      \n`,
      nargs: '*',
    },
  )

  // parser.addArgument(
  //   [ '-d', '--directory' ],
  //   {
  //     help: 'Dataset Directory',
  //     defaultValue: path.join(MODULE_ROOT, 'datasets', 'lfw'),
  //   },
  // )

  parser.addArgument(
    [ '-l', '--log' ],
    {
      defaultValue: 'info',
      help: 'Log Level: silent, verbose, silly',
    },
  )

  return parser.parseArgs()
}

process.on('warning', (warning) => {
  console.warn(warning.name)    // Print the warning name
  console.warn(warning.message) // Print the warning message
  console.warn(warning.stack)   // Print the stack trace
})

main(parseArguments())
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})

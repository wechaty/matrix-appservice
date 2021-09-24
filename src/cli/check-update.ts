import { readPackageUpAsync }           from 'read-pkg-up'
import { UpdateNotifier }   from 'update-notifier'

import { codeRoot } from '../config.js'

export function checkUpdate (): void {
  readPackageUpAsync({ cwd: codeRoot })
    .then(pack => {
      if (!pack) {
        throw new Error('package.json not found')
      }

      const pkg = pack.packageJson
      // 1 week
      const updateCheckInterval = 1000 * 60 * 60 * 24 * 7

      const notifier  = new UpdateNotifier({
        pkg,
        updateCheckInterval,
      })
      notifier.notify()
      return null
    })
    .catch(console.error)
}

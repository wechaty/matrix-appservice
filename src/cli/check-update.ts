import { dirname } from 'path'
import { fileURLToPath } from 'url'
import readPkgUp            from 'read-pkg-up'
import { UpdateNotifier }   from 'update-notifier'

const __dirname = dirname(fileURLToPath(import.meta.url))
export function checkUpdate (): void {
  readPkgUp({ cwd: __dirname })
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

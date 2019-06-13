import readPkgUp            from 'read-pkg-up'
import { UpdateNotifier }   from 'update-notifier'

export function checkUpdate (): void {
  readPkgUp({ cwd: __dirname })
    .then(pack => {
      if (!pack) {
        return
      }

      const pkg = pack.package
      // 1 week
      const updateCheckInterval = 1000 * 60 * 60 * 24 * 7

      const notifier  = new UpdateNotifier({
        pkg,
        updateCheckInterval,
      })
      notifier.notify()
    })
    .catch(console.error)
}

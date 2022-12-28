import path from 'node:path'
import { rmSync } from 'node:fs'
import { defineConfig } from 'vite'
import electron from 'vite-electron-plugin'
import { customStart } from 'vite-electron-plugin/plugin'

rmSync(path.join(__dirname, 'dist-electron'), { recursive: true, force: true })

export default defineConfig({
  plugins: [electron({
    include: [
      'electron',
    ],
    plugins: [
      customStart(debounce(args => {
        if (['.ts', '.js'].some(ext => args.filename.endsWith('reload' + ext))) {
          // Any file ending with `reload.ext` *(e.g. `foo.reload.js`, `preload.ts`)* after an update, 
          // will trigger a reload of the Electron-Renderer process, instead of an entire Electron App restart. 
          // Which is useful when updating Preload-Scripts.
          args.reload()
        } else {
          // This callback function will be called when the "js" files in the include changes
          // Equivalent to - `electron . --no-sandbox` (make sure the "main" field in package.json is correct)
          args?.startup(['.', '--no-sandbox'])
        }
      })),
    ],
  })],
})

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout
  return ((...args) => {
    // !t && fn(...args) // first call
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }) as Fn
}

import path from 'path'
import { rmSync } from 'fs'
import { defineConfig } from 'vite'
import electron, { ResolvedConfig } from 'vite-electron-plugin'

rmSync(path.join(__dirname, 'dist-electron'), { recursive: true, force: true })

let config: ResolvedConfig
let startup: ResolvedConfig['startup']

export default defineConfig({
  plugins: [electron({
    include: [
      'electron',
    ],
    configResolved(_config) {
      config = _config
      startup = debounce(_config.startup)
    },
    onwatch(_event, filepath) {
      const { extensions, isPreload, viteDevServer } = config

      if (extensions.some(ext => path.extname(filepath))) {
        if (isPreload(filepath)) {
          viteDevServer?.ws.send({ type: 'full-reload' })
        } else {
          startup(['.', '--no-sandbox'])
        }
      }
    },
    startup: false,
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

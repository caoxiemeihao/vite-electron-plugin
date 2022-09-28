import type { Plugin, ResolvedConfig } from '..'

export function customStart(callback?: (args?: {
  startup: ResolvedConfig['_fn']['startup']
  filename: string
}) => void): Plugin {
  let config: ResolvedConfig
  let startup: (filename: string) => void

  return {
    name: 'custom-start',
    configResolved(_config) {
      const { command, viteDevServer, _fn } = config = _config
      const index = _config.plugins.findIndex(plugin => plugin.name === ':startup')
      if (index > -1) {
        // Remove internal startup function
        config.plugins.slice(index, 1)
      }

      if (command === 'serve' && callback) {
        startup = debounce(function startup_fn(filename: string) {
          /**
           * Preload-Scripts
           * e.g.
           * - `xxx.preload.js`
           * - `xxx.preload.ts`
           */
          const ispreload = config.extensions.some(ext => filename.endsWith('preload' + ext))
          if (ispreload) {
            viteDevServer!.ws.send({ type: 'full-reload' })
          } else {
            callback({ startup: _fn.startup, filename })
          }
        })
      }
    },
    ondone({ filename }) {
      if (config?.command === 'serve') {
        startup(filename)
      }
    },
  }
}

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout
  return ((...args) => {
    // !t && fn(...args) // first call
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }) as Fn
}

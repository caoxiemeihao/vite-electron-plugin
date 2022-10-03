import path from 'path'
import { type Loader, transform } from 'esbuild'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
} from './config'
import {
  colours,
  debounce,
  logger,
} from './utils'

export function resolvePlugins(config: Configuration): Plugin[] {

  return [
    esbuild(),
    startup(),
    ...(config.plugins ?? []),
  ]
}

function esbuild(): Plugin {
  let config: ResolvedConfig

  return {
    name: ':esbuild',
    configResolved(_config) {
      config = _config
    },
    transform({ filename, code }) {
      const { transformOptions } = config
      return transform(code, {
        loader: path.extname(filename).slice(1) as Loader,
        ...transformOptions,
      })
    },
  }
}

function startup(): Plugin {
  let config: ResolvedConfig
  let startup: () => void
  const files: string[] = []

  return {
    name: ':startup',
    configResolved(_config) {
      const { command, viteDevServer, _fn } = config = _config
      if (command === 'serve') {
        startup = debounce(function startup_fn() {
          /**
           * Preload-Scripts
           * e.g.
           * - `xxx.preload.js`
           * - `xxx.preload.ts`
           */
          const ispreload = config.extensions.some(ext => files.every(file => file.endsWith('preload' + ext)))
          files.length = 0

          if (ispreload) {
            viteDevServer!.ws.send({ type: 'full-reload' })
          } else {
            _fn.startup()
            logger.log(colours.green('[startup]'), 'Electron App')
          }
        })
      }
    },
    ondone({ filename }) {
      if (config?.command === 'serve') {
        files.push(filename)
        startup()
      }
    },
  }
}

import fs from 'node:fs'
import type { ResolvedConfig as ViteResolvedConfig } from 'vite'
import { bootstrap } from './serve'
import { build } from './build'
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
  resolveConfig,
} from './config'
import { name } from '../package.json'
import { ensureDir, jsType } from './utils'

// public export
export {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
  defineConfig,
  electron as default,
}

function defineConfig(config: Configuration) {
  return config
}

function electron(config: Configuration): import('vite').Plugin[] {
  let viteResolvedConfig: ViteResolvedConfig

  return [
    {
      name: `${name}:serve`,
      apply: 'serve',
      async configureServer(server) {
        server.httpServer!.on('listening', () => bootstrap(config, server))
      },
    },
    {
      name: `${name}:build`,
      apply: 'build',
      config(config) {
        // Make sure that Electron App can be loaded into the local file using `loadFile` after build
        config.base ??= './'
      },
      configResolved(config) {
        viteResolvedConfig = config
      },
      async closeBundle() {
        const resolved = await resolveConfig(config, viteResolvedConfig)
        const { _fn, plugins } = resolved
        for (const filename of _fn.include2files(resolved)) {
          const js_type = jsType(filename)
          const destname = _fn.replace2dest(filename, true)
          if (js_type.js) {
            await build(resolved, filename)
          } else if (js_type.static) {
            // static files
            fs.copyFileSync(filename, ensureDir(destname))
          }

          if (js_type.js || js_type.static) {
            for (const plugin of plugins) {
              // call ondone hooks
              plugin.ondone?.({ filename, destname })
            }
          }
        }
      },
    },
  ]
}

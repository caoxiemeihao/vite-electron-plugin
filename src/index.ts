import fs from 'fs'
import {
  type UserConfig,
  type Plugin as VitePlugin,
} from 'vite'
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

function electron(config: Configuration): VitePlugin[] {
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
      config(_config) {
        electronConfigPreset(_config)
      },
      async closeBundle() {
        const resolved = await resolveConfig(config, 'build')
        const { _fn, plugins } = resolved
        for (const filename of _fn.include2files(resolved)) {
          const js_type = jsType(filename)
          const distname = _fn.replace2dist(filename, true)
          if (js_type.js) {
            await build(resolved, filename)
          } else if (js_type.static) {
            // static files
            fs.copyFileSync(filename, ensureDir(distname))
          }

          if (js_type.js || js_type.static) {
            for (const plugin of plugins) {
              // call ondone hooks
              plugin.ondone?.({ filename, distname })
            }
          }
        }
      },
    },
  ]
}

function electronConfigPreset(config: UserConfig) {
  // make sure that Electron can be loaded into the local file using `loadFile` after packaging
  config.base ??= './'

  config.build ??= {}

  // TODO: init `config.build.target`
  // https://github.com/vitejs/vite/pull/8843

  // ensure that static resources are loaded normally
  // TODO: Automatic splicing `build.assetsDir`
  config.build.assetsDir ??= ''

  // https://github.com/electron-vite/electron-vite-vue/issues/107
  config.build.cssCodeSplit ??= false

  // prevent accidental clearing of `dist/electron/main`, `dist/electron/preload`
  config.build.emptyOutDir ??= false

  return config
}

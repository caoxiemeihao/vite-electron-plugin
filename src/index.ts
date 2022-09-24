import type { UserConfig, Plugin } from 'vite'
import { bootstrap } from './serve'
import { build } from './build'
import {
  type Configuration,
  resolveConfig,
} from './config'

// public export
export {
  type Configuration,
  defineConfig,
  electron as default,
}

function defineConfig(config: Configuration) {
  return config
}

function electron(config: Configuration): Plugin[] {
  const name = 'vite-plugin-electron-unbuild'

  return [
    {
      name: `${name}:serve`,
      apply: 'serve',
      configureServer(server) {
        const resolved = resolveConfig(config, 'serve')
        server.httpServer!.on('listening', () => {
          bootstrap(resolved, server)
        })
      },
    },
    {
      name: `${name}:build`,
      apply: 'build',
      config(_config) {
        electronConfigPreset(_config)
      },
      async closeBundle() {
        const resolved = resolveConfig(config, 'build')
        const { include2files } = resolved
        await build(resolved, include2files)
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

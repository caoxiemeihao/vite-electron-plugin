import type { ViteDevServer } from 'vite'
import type { Plugin, ResolvedConfig } from '..'

export function customStart(callback?: (args?: {
  startup: ResolvedConfig['_fn']['startup']
  filename: string
  viteDevServer: ViteDevServer
}) => void): Plugin {
  let config: ResolvedConfig

  return {
    name: 'custom-start',
    configResolved(_config) {
      config = _config
      // Remove internal startup function
      config.plugins.slice(_config.plugins.findIndex(plugin => plugin.name === ':startup'), 1)
    },
    ondone({ filename }) {
      if (config?.command === 'serve' && callback) {
        callback({ startup: config._fn.startup, filename, viteDevServer: config.viteDevServer! })
      }
    },
  }
}

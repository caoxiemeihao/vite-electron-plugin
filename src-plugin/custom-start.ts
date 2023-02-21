import type { Plugin, ResolvedConfig } from '..'

export function customStart(callback?: (args?: {
  startup: ResolvedConfig['experimental']['startup']
  reload: ResolvedConfig['experimental']['reload']
  filename: string
  // arguments should be side-effect free
  // viteDevServer: ViteDevServer
}) => void): Plugin {
  let config: ResolvedConfig

  return {
    name: 'plugin-custom-start',
    configResolved(_config) {
      config = _config
      const index = _config.plugins.findIndex(plugin => plugin.name === ':startup')
      if (index > -1) {
        // Remove internal startup plugin
        config.plugins.splice(index, 1)
      }
    },
    ondone({ filename }) {
      const { api: { vite }, experimental } = config
      if (vite?.resolvedConfig?.command === 'serve' && callback) {
        callback({
          startup: experimental.startup,
          reload: experimental.reload,
          filename,
        })
      }
    },
  }
}

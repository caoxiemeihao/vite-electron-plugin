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
      // Remove internal startup function
      config.plugins.splice(_config.plugins.findIndex(plugin => plugin.name === ':startup'), 1)
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

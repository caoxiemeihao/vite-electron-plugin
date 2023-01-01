import { loadEnv } from 'vite'
import type { Plugin } from '..'

export function loadViteEnv(): Plugin {
  return {
    name: 'plugin-load-vite-env',
    async configResolved(config) {
      const { api: { vite } } = config
      let env = {}
      if (vite?.resolvedConfig) {
        env = vite.resolvedConfig.env ?? env
      } else if (vite?.config) {
        env = await new Promise(resolve => {
          vite.config!.plugins ??= []
          vite.config!.plugins.push({
            name: 'plugin-get-env',
            async config(_, { mode }) {
              resolve(loadEnv(mode, config.root))
            },
          })
        })
      }
      // Use words array instead `import.meta.env` for avoid esbuild transform. 🤔
      const words = ['import', 'meta', 'env']
      config.transformOptions.define = Object.fromEntries(Object
        .entries(env)
        .map(([key, value]) => [words.concat(key).join('.'), JSON.stringify(value)]))
    },
    transform({ code }) {
      const import_meta = 'const import_meta = {}'
      const import_meta_polyfill = 'const import_meta = { url: "file:" + __filename, env: {/* Vite\'s shim */} }'
      if (code.includes(import_meta)) {
        // https://github.com/evanw/esbuild/issues/2441
        return code.replace(import_meta, import_meta_polyfill)
      }
    },
  }
}

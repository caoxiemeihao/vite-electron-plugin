import type { Plugin } from '..'

export function loadViteEnv(): Plugin {
  return {
    name: 'plugin-load-vite-env',
    async configResolved(config) {
      const { api: { vite } } = config
      let env = {}
      if (vite?.resolvedConfig) {
        env = vite.resolvedConfig.env ?? env
      }
      // Use words array instead `import.meta.env` for avoid esbuild transform. 🤔
      const words = ['import', 'meta', 'env']
      config.transformOptions.define = Object.fromEntries(Object
        .entries(env)
        .map(([key, value]) => [words.concat(key).join('.'), JSON.stringify(value)]))
    },
    transform({ code }) {
      const import_meta = 'const import_meta = {}'
      const import_meta_polyfill = 'const import_meta = { url: "file:" + __filename, env: {/* Vite shims */} }'
      if (code.includes(import_meta)) {
        // https://github.com/evanw/esbuild/issues/2441
        return code.replace(import_meta, import_meta_polyfill)
      }
    },
  }
}

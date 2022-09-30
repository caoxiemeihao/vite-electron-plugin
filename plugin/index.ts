import path from 'path'
import type { ViteDevServer } from 'vite'
import type { Plugin, ResolvedConfig } from '..'

// TODO: use ast implement alias plugin
export function alias(options: {
  find: string | RegExp
  replacement: string
}[]): Plugin {
  const requireRE = /require\(("(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+')\)/g
  const startOffset = 'require('.length

  return {
    name: 'plugin-alias',
    async transform({ code: source, filename: importer }) {
      let code = source
      let match = null
      requireRE.lastIndex = 0
      const nodes: {
        start: number
        end: number
        raw: string
      }[] = []

      while (match = requireRE.exec(source)) {
        const [, id] = match
        const start = match.index + startOffset
        const end = start + id.length
        nodes.unshift({ start, end, raw: id })
      }

      if (!nodes.length) {
        return null
      }

      for (const node of nodes) {
        const { start, end, raw } = node
        const id = raw.slice(1, -1)

        const option = options.find(opt => opt.find instanceof RegExp
          ? opt.find.test(id)
          : id.startsWith(opt.find + '/'))
        if (!option) continue

        let { find, replacement } = option
        if (path.isAbsolute(replacement)) {
          replacement = path.posix.relative(path.dirname(importer), replacement)
        }
        code = code.slice(0, start) + raw.replace(find, replacement) + code.slice(end)
      }

      return code === source ? null : code
    },
  }
}

export function customStart(callback?: (args?: {
  startup: ResolvedConfig['_fn']['startup']
  filename: string
  viteDevServer: ViteDevServer
}) => void): Plugin {
  let config: ResolvedConfig

  return {
    name: 'plugin-custom-start',
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

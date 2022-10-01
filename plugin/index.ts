import fs from 'fs'
import path from 'path'
import { type ViteDevServer, normalizePath } from 'vite'
import type { Plugin, ResolvedConfig } from '..'
import { colours, ensureDir } from '../src/utils'

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

export function copy(options: {
  from: string
  to: string
}[]): Plugin {
  const copyStream = (filename: string, destname: string) => fs
    .createReadStream(filename)
    .pipe(fs.createWriteStream(destname))
    .on('error', error => console.log(colours.red(error.message)))

  return {
    name: 'plugin-copy',
    configResolved(config) {
      ; (async () => {
        const { default: fastGlob } = await import('fast-glob')

        for (const option of options) {
          fastGlob(option.from, { cwd: config.root }).then(files => {
            for (const filename of files) {

              const relative = normalizePath(option.from).replace(config.root + '/', '')
              // /root/foo/bar-*/* -> /foo
              // /root/foo/**/*    -> /foo
              // /root/*           -> 
              let exact: string
              if (relative.includes('*')) {
                const paths = relative.split('/')
                exact = paths.slice(0, paths.findIndex(p => p.includes('*'))).join('/')
              } else {
                exact = relative
              }

              const destname = path.posix.join(
                path.posix.resolve(config.root, normalizePath(option.to)),
                filename.replace(path.posix.join(config.root, exact), ''),
              )
              ensureDir(destname)
              copyStream(filename, destname).on('finish', () => console.log(colours.green('[copy]'), destname))
            }
          })
        }
      })()
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

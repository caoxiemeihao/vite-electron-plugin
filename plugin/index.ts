import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from '..'
import {
  colours,
  ensureDir,
  logger,
  normalizePath,
  relativeify,
} from '../src/utils'

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
        const [, rawId] = match
        const start = match.index + startOffset
        const end = start + rawId.length
        nodes.unshift({ start, end, raw: rawId })
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
          replacement = path.relative(path.dirname(importer), replacement)
        }
        // Convert to unix path
        replacement = relativeify(normalizePath(replacement))
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
    .on('error', error => logger.error(error.message))

  return {
    name: 'plugin-copy',
    configResolved(config) {
      ; (async () => {
        const { default: fastGlob } = await import('fast-glob')

        for (const option of options) {
          option.from = normalizePath(option.from)
          option.to = normalizePath(option.to)

          fastGlob((option.from), { cwd: config.root }).then(files => {
            for (const filename of files) {

              let copyRoot: string
              if (option.from.includes('*')) {
                // /root/foo/bar-*/* -> /root/foo
                // /root/foo/**/*    -> /root/foo
                // /root/*           -> /root
                const paths = option.from.split('/')
                copyRoot = paths.slice(0, paths.findIndex(p => p.includes('*'))).join('/')
              } else {
                copyRoot = option.from
              }

              option.to = path.isAbsolute(option.to) ? option.to : path.posix.join(config.root, option.to)
              const destname = path.posix.join(option.to, filename.replace(copyRoot, ''))

              ensureDir(destname)
              copyStream(filename, destname).on('finish', () =>
                logger.log(colours.green('[plugin/copy]'), destname),
              )
            }
          })
        }
      })()
    },
  }
}

export function customStart(callback?: (args?: {
  startup: ResolvedConfig['_fn']['startup']
  reload: ResolvedConfig['_fn']['reload']
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
      if (config?.command === 'serve' && callback) {
        callback({
          startup: config._fn.startup,
          reload: config._fn.reload,
          filename,
        })
      }
    },
  }
}

export function loadViteEnv(): Plugin {
  return {
    name: 'plugin-load-vite-env',
    configResolved(config) {
      const { env } = config.viteResolvedConfig
      // Use words array instead `import.meta.env` for avoid esbuild transform. 🤔
      const words = ['import', 'meta', 'env']
      config.transformOptions.define = Object.fromEntries(Object
        .entries(env)
        .map(([key, value]) => [words.concat(key).join('.'), JSON.stringify(value)]))
    },
  }
}

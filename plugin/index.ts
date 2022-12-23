import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { normalizePath } from 'notbundle'
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
      let match: RegExpExecArray | null = null
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
        // Convert to POSIX path
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
                logger.log(colours.green('[plugin/copy]'), destname.replace(config.root + '/', '')),
              )
            }
          })
        }
      })()
    },
  }
}

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

// ----------------------------------------------- utils

/**
 * @see https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */
const colours = {
  $_$: (c: number) => (str: string) => `\x1b[${c}m` + str + '\x1b[0m',
  gary: (str: string) => colours.$_$(90)(str),
  cyan: (str: string) => colours.$_$(36)(str),
  yellow: (str: string) => colours.$_$(33)(str),
  green: (str: string) => colours.$_$(32)(str),
  red: (str: string) => colours.$_$(31)(str),
}

function ensureDir(filename: string): string {
  const dir = path.dirname(filename)
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })
  return filename
}

type LogType = 'error' | 'info' | 'success' | 'warn' | 'log'
const logger: Record<LogType, (...message: string[]) => void> & { $_$: (type: LogType, ...message: string[]) => void } = {
  $_$: (type, ...message) => {
    if (type !== 'log') {
      const dict: Record<string, Exclude<keyof typeof colours, '$_$'>> = {
        error: 'red',
        info: 'cyan',
        success: 'green',
        warn: 'yellow',
      }
      const color = dict[type]
      message = message.map(msg => colours[color](msg))
    }
    console.log(...message)
  },
  error: (...message) => logger.$_$('error', ...message),
  info: (...message) => logger.$_$('info', ...message),
  success: (...message) => logger.$_$('success', ...message),
  warn: (...message) => logger.$_$('warn', ...message),
  log: (...message) => console.log(...message),
}

/**
 * - `'' -> '.'`
 * - `foo` -> `./foo`
 */
export function relativeify(relative: string) {
  if (relative === '') {
    return '.'
  }
  if (!relative.startsWith('.')) {
    return './' + relative
  }
  return relative
}

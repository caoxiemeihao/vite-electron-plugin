import path from 'node:path'
import {
  MagicString,
  normalizePath,
  relativeify,
  walk,
} from 'vite-plugin-utils/function'
import type { Plugin } from '..'

export interface AliasNode {
  type: 'require' | 'import'
  start: number
  end: number
  importee: {
    start: number
    end: number
    raw: string
  }
}

export function alias(options: {
  find: string | RegExp
  replacement: string
}[]): Plugin {
  let acorn: typeof import('acorn')
  return {
    name: 'plugin-alias',
    async transform({ code, filename: importer }) {
      if (!/require|import/.test(code)) return

      try {
        acorn ??= await import('acorn')
      } catch {
        throw new Error('[plugin/alias] dependency "acorn". Did you install it?')
      }

      const ast = acorn.parse(code, {
        // https://github.com/electron-vite/electron-vite-react/issues/98#issuecomment-1372810726
        ecmaVersion: 2022,
      })
      const ms = new MagicString(code)
      const nodes: AliasNode[] = []

      // Electron only support cjs. So here only convert `require()`, `import()`.
      walk.sync(ast as Record<string, any>, {
        CallExpression(node) {
          if (node.callee.name !== 'require') return
          const { start, end, arguments: args } = node
          if (args.length === 1 && args[0].type === 'Literal') {
            // TODO: other arguments[0].type
            const literal = args[0]
            nodes.push({
              type: 'require',
              start,
              end,
              importee: {
                start: literal.start,
                end: literal.end,
                raw: literal.raw,
              },
            })
          }
        },
        ImportExpression(node) {
          const { start, end, source } = node
          nodes.push({
            type: 'import',
            start,
            end,
            importee: {
              start: source.start,
              end: source.end,
              raw: source.raw,
            },
          })
        },
      })

      for (const node of nodes) {
        const {
          start,
          end,
          importee,
          type,
        } = node

        const source = importee.raw.slice(1, -1)
        const option = options.find(opt => opt.find instanceof RegExp
          ? opt.find.test(source)
          : source.startsWith(opt.find + '/'))
        if (!option) continue

        let { find, replacement } = option
        if (path.isAbsolute(replacement)) {
          replacement = path.relative(path.dirname(importer), replacement)
        }
        // Convert to POSIX path
        replacement = relativeify(normalizePath(replacement))
        replacement = 'require("' + source.replace(find, replacement) + '")'
        if (type === 'import') {
          replacement = `new Promise((resolve, reject) => {try {resolve(${replacement})} catch (error) {reject(error)}})`
        }
        ms.overwrite(start, end, replacement)
      }

      return ms.toString()
    },
  }
}

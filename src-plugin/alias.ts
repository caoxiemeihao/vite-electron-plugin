import path from 'node:path'
import { normalizePath } from 'notbundle'
import type { Plugin } from '..'
import { relativeify } from './utils'

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
        code = code.slice(0, start) + ['"', id.replace(find, replacement), '"'].join('') + code.slice(end)
      }

      return code === source ? null : code
    },
  }
}

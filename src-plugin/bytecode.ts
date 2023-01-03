import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import type { Plugin, ResolvedConfig } from '..'

export function bytecode(options: {} = {}): Plugin {
  let config: ResolvedConfig
  let littleByte: typeof import('little-byte').default
  return {
    name: 'plugin-bytecode',
    configResolved(_config) {
      config = _config
    },
    ondone(args) {
      if (config.api.vite?.resolvedConfig?.command !== 'build') {
        // production
        // return
      }
      try {
        littleByte ??= createRequire(import.meta.url)('little-byte').default
      } catch {
        throw new Error('[plugin/bytecode] dependency "little-byte". Did you install it?')
      }
      const { destname } = args
      const { name } = path.parse(destname!)
      littleByte.compiler.compileFile(destname!)
      const code = `require('little-byte').default.loader.execByteCode(require('path').join(__dirname, '${name}.bytecode'));`
      fs.writeFileSync(destname!, code)
    },
  }
}

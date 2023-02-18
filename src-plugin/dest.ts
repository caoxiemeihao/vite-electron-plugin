import fs from 'node:fs'
import path from 'node:path'
import { COLOURS } from 'vite-plugin-utils/function'
import type { Plugin, ResolvedConfig } from '..'
import { ensureDir } from './utils'

export function dest(
  callback: (form: string, to?: string) => string | undefined | Promise<string | undefined>
): Plugin {
  let config: ResolvedConfig
  let output: string

  return {
    name: 'plugin-dest',
    async configResolved(_config) {
      config = _config
      output = _config.outDir
      // @ts-ignore
      // https://github.com/caoxiemeihao/notbundle/blob/v0.3.4/src/config.ts#L22-L26
      _config.output = undefined
    },
    async ondone({ code, filename }) {
      const { experimental } = config
      const destname = await callback?.(
        filename,
        // @ts-ignore
        experimental.input2output({ ...config, output, }, filename),
      )

      if (!destname) return
      if (destname === filename) {
        const message = `Input and output are the same file\n  ${filename} -> ${destname}`
        throw new Error(message)
      }

      fs.writeFileSync(ensureDir(destname), code)
      console.log(COLOURS.green('[plugin/dest]'), new Date().toLocaleTimeString(), `${path.relative(config.root, destname)}`)
    },
  }
}

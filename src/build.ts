import fs from 'node:fs'
import path from 'node:path'
import { type ResolvedConfig } from './config'
import { colours, logger, ensureDir } from './utils'

export async function build(config: ResolvedConfig, filename: string) {
  const { _fn, plugins } = config
  const destname = _fn.replace2dest(filename, true)

  if (destname === filename) {
    logger.log(
      colours.yellow('Input and output are the same file\n '),
      filename, '->', destname,
    )
  } else {
    ensureDir(destname)

    let code = fs.readFileSync(filename, 'utf8')
    let done = false
    for (const plugin of plugins) {
      if (done) break
      // call transform hooks
      const result = await plugin.transform?.({
        filename,
        code,
        done() { done = true },
      })
      if (!result) continue
      if (typeof result === 'string') {
        code = result
      } else if (result !== null && typeof result === 'object') {
        if (result.warnings.length) {
          logger.warn(result.warnings.map(e => e.text).join('\n'))
        }
        code = result.code
        if (result.map) {
          const map = JSON.parse(result.map)
          const parsed = path.parse(destname)
          map.file = parsed.base
          map.sources = [path.relative(parsed.dir, filename)]
          fs.writeFileSync(destname + '.map', JSON.stringify(map))
          code += `\n//# sourceMappingURL=${path.basename(destname)}.map`
        }
      }
    }

    fs.writeFileSync(destname, code)
    logger.log(
      colours.cyan('[write]'),
      colours.gary(new Date().toLocaleTimeString()),
      `${destname}`,
    )
  }
}

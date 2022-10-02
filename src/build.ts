import fs from 'fs'
import path from 'path'
import { type ResolvedConfig } from './config'
import { colours, ensureDir } from './utils'

export async function build(config: ResolvedConfig, filename: string) {
  const { _fn, plugins } = config
  const distname = _fn.replace2dist(filename, true)

  if (distname === filename) {
    console.log(
      colours.yellow('Input and output are the same file\n '),
      filename, '->', distname,
    )
  } else {
    ensureDir(distname)

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
          console.log(colours.yellow(result.warnings.map(e => e.text).join('\n')))
        }
        code = result.code
        if (result.map) {
          const map = JSON.parse(result.map)
          const parsed = path.parse(distname)
          map.file = parsed.base
          map.sources = [path.relative(parsed.dir, filename)]
          fs.writeFileSync(distname + '.map', JSON.stringify(map))
          code += `\n//# sourceMappingURL=${path.basename(distname)}.map`
        }
      }
    }

    fs.writeFileSync(distname, code)
    console.log(colours.cyan(`[${new Date().toLocaleTimeString()}]`), distname)
  }
}

import fs from 'fs'
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
        // TODO: sourcemap
      }
    }

    fs.writeFileSync(ensureDir(distname), code)
    console.log(colours.cyan(`[${new Date().toLocaleTimeString()}]`), distname)
  }
}

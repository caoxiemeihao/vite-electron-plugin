import fs from 'fs'
import path from 'path'
import { normalizePath } from 'vite'
import { type Loader, transform } from 'esbuild'
import {
  type ResolvedConfig,
  colours,
} from './config'

export async function build(config: ResolvedConfig, files: string | string[]) {
  const { src2dist, transformOptions, config: rawConfig } = config

  for (const filename of [files].flat().map(file => normalizePath(file))) {
    const distname = src2dist(filename)
    if (distname === filename) {
      console.log(
        colours.yellow('Input and output are the same file\n '),
        filename, '->', distname,
      )
      return
    }

    const distpath = path.dirname(distname)
    let code = fs.readFileSync(filename, 'utf8')
    let stop = false

    const transformed = await rawConfig.transform?.({
      filename,
      code,
      stop() {
        stop = true
      },
    })

    if (typeof transformed === 'string') {
      code = transformed
    }

    if (!stop) {
      switch (path.extname(filename)) {
        case '.ts':
        case '.js':
          try {
            const result = await transform(code, {
              loader: path.extname(filename).slice(1) as Loader,
              ...transformOptions,
            })
            if (result.warnings.length) {
              console.log(colours.yellow(result.warnings.map(e => e.text).join('\n')))
            }

            code = result.code
          } catch (error) {
            console.log(colours.red(error as string))
          }
          break
      }
    }

    if (!fs.existsSync(distpath)) {
      fs.mkdirSync(distpath, { recursive: true })
    }

    fs.writeFileSync(distname, code)
    console.log(colours.cyan(`[${new Date().toLocaleTimeString()}]`), distname)
  }
}

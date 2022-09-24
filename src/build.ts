import fs from 'fs'
import path from 'path'
import { type Loader, transform } from 'esbuild'
import {
  type ResolvedConfig,
  colours,
} from './config'

export async function build(config: ResolvedConfig, files: string | string[]) {
  const { src2dist, transform: transformOptions } = config

  for (const filename of [files].flat()) {
    const distname = src2dist(filename)
    const distpath = path.dirname(distname)
    const code = fs.readFileSync(filename, 'utf8')

    const result = await transform(code, {
      loader: path.extname(filename).slice(1) as Loader,
      ...transformOptions,
    })

    if (!fs.existsSync(distpath)) {
      fs.mkdirSync(distpath, { recursive: true })
    }

    if (distname === filename) {
      console.log(
        colours.yellow,
        'Input and output are the same file\n ',
        filename, '->', distname
      )
    } else {
      fs.writeFileSync(distname, result.code)
      console.log(colours.cyan, `[${new Date().toLocaleTimeString()}]`, distname)
    }
  }
}

import fs from 'node:fs'
import path from 'node:path'
import { colours, normalizePath } from 'notbundle'
import type { Plugin } from '..'
import { ensureDir } from './utils'

export function copy(options: {
  from: string
  to: string
}[]): Plugin {
  const copyStream = (filename: string, destname: string) => fs
    .createReadStream(filename)
    .pipe(fs.createWriteStream(destname))
    .on('error', error => console.log(colours.red(error.message)))

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
                console.log(colours.green('[plugin/copy]'), destname.replace(config.root + '/', '')),
              )
            }
          })
        }
      })()
    },
  }
}

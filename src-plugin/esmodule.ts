import fs from 'node:fs'
import path from 'node:path'
import { createRequire, builtinModules } from 'node:module'
import esbuild from 'esbuild'
import { colours } from 'notbundle'
import type { Plugin } from '..'
import { alias } from './alias'
import {
  ensureDir,
  node_modules,
  normalizePath,
} from './utils'

const CACHE_DIR = '.esmodule'

export type ESModuleOptions = {
  /**
   * ESM npm-package names
   */
  include: string[]
  /**
   * Options of esbuild.build()
   */
  buildOptions?: import('esbuild').BuildOptions
  /**
   * @default ".esmodule"
   */
  cacheDir?: string
}

/**
 * Support use ESM npm-package in Electron-Main.  
 * e.g. `execa`, `node-fetch`, `got`, etc.
 */
export function esmodule(options: ESModuleOptions): Plugin {
  return {
    name: 'plugin-esmodule',
    async configResolved(config) {
      const { root } = config
      let { include, cacheDir, buildOptions = {} } = options

      cacheDir = normalizePath(path.resolve(root, cacheDir ?? CACHE_DIR))
      // TODO: cache check
      fs.rmSync(cacheDir, { recursive: true, force: true })

      const aliasOptions: Parameters<typeof alias>[0] = []

      await Promise.all(include.map(name => {
        aliasOptions.push({ find: new RegExp(`^${name}$`), replacement: [cacheDir, name].join('/') })
        return esmBundling({
          name,
          root,
          cacheDir,
          buildOptions,
        })
      }))

      const aliasPlugin = alias(aliasOptions)
      aliasPlugin.configResolved?.call(aliasPlugin, config)
      config.plugins.push(aliasPlugin)
    },
  }
}

async function esmBundling(args: {
  name: string,
  root: string,
  cacheDir: string,
  buildOptions?: esbuild.BuildOptions,
}) {
  const {
    name,
    root,
    cacheDir,
    buildOptions = {},
  } = args
  const cjs_require = createRequire(import.meta.url)

  buildOptions.format ??= 'cjs'
  buildOptions.target ??= 'node14'

  const pkgPath = path.join(node_modules(root), name)
  let entry: string
  try {
    entry = cjs_require.resolve(pkgPath)
  } catch (error: any) {
    console.log(colours.red(error))
    return
  }

  const outfile = path.join(cacheDir, name + '.js')
  ensureDir(outfile)

  const result = await esbuild.build({
    entryPoints: [entry],
    outfile,
    target: 'node14',
    format: 'cjs',
    bundle: true,
    sourcemap: true,
    external: [
      ...builtinModules,
      ...builtinModules.map(mod => `node:${mod}`),
    ],
    ...buildOptions,
  })

  if (!result.errors.length) {
    console.log(colours.green('[plugin/esmodule]'), path.posix.relative(root, outfile))
  }

  return result
}

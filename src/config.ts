import fs from 'fs'
import path from 'path'
import { normalizePath } from 'vite'
import type { TransformOptions } from 'esbuild'
import fastGlob from 'fast-glob'
import { watch, FSWatcher } from 'chokidar'

export interface Configuration {
  /** @default process.cwd() */
  root?: string
  /** Electron-Main, Preload-Scripts */
  include: string[]
  /** @default 'dist-electron' */
  outDir?: string
  /** Triggered by `include` file changes */
  onstart?: (args: {
    /** The file taht Triggered the onstart */
    fielname: '' // first start
    | string
    event: '' // first start
    | 'add'
    | 'change'
    | 'addDir'
    | 'unlink'
    | 'unlinkDir'
    /** Electron App startup function */
    startup: () => Promise<void>
    viteDevServer: import('vite').ViteDevServer
  }) => void
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions
}

export interface ResolvedConfig {
  config: Configuration
  root: string
  /** Relative path */
  include: string[]
  outDir: string
  transformOptions: TransformOptions
  watcher: FSWatcher | null
  include2files: string[]
  src2dist: (filename: string) => string
}

export function resolveConfig(config: Configuration, command: 'build' | 'serve'): ResolvedConfig {
  const {
    root,
    include,
    outDir,
    transformOptions,
  } = config
  // https://github.com/vitejs/vite/blob/9a83eaffac3383f5ee68097807de532f0b5cb25c/packages/vite/src/node/config.ts#L456-L459
  // resolve root
  const resolvedRoot = normalizePath(
    root ? path.resolve(root) : process.cwd()
  )
  const defaultOutDir = normalizePath(outDir ?? 'dist-electron')

  const resolved: ResolvedConfig = {
    config,
    root: resolvedRoot,
    include: include.map(p => path.isAbsolute(p)
      ? p.replace(resolvedRoot + '/', '')
      : p),
    outDir: path.isAbsolute(defaultOutDir)
      ? defaultOutDir
      : path.posix.join(resolvedRoot, defaultOutDir),
    transformOptions: Object.assign({
      target: 'node14',
      // At present, Electron(20) can only support CommonJs
      format: 'cjs',
    }, transformOptions),
    watcher: null,
    // @ts-ignore
    include2files: null,
    // @ts-ignore
    src2dist: null,
  }

  resolved.include2files = include2files(resolved)
  resolved.src2dist = (filename: string) => src2dist(resolved, filename)

  if (command === 'serve') {
    resolved.watcher = watch(/* 🚨 Any file */include2globs(resolved))
  }

  return resolved
}

export const extensions = ['.ts', '.js']

/**
 * @see https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */
export const colours = {
  cyan: '\x1b[36m%s\x1b[0m',
  yellow: '\x1b[33m%s\x1b[0m',
}

// ----------------------------------------------------------------------

function include2files(config: ResolvedConfig) {
  return fastGlob
    .sync(include2globs(config))
    .filter(p => extensions.includes(path.extname(p)))
}

function include2globs(config: ResolvedConfig, files = config.include) {
  const { root } = config
  return files
    .map(p => path.posix.join(root, p))
    .map(p => {
      try {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
          return path.join(p, '**/*')
        }
      } catch { }
      return p
    })
}

function src2dist(
  config: ResolvedConfig,
  filename: string,
  relpaceTS = true,
) {
  const { root, outDir } = config
  if (src2dist.reduce1level === false) {
    // This behavior is more like tsc
    //
    // electron -> dist-electron
    //
    // ├─┬ electron
    // │ ├─┬ main.ts
    // │ │ └── index.ts
    // │ └── preload.ts
    //  ↓
    // ├─┬ dist-electron
    // │ ├─┬ main.js
    // │ │ └── index.js
    // │ └── preload.js
    //
    // electron -> dist-electron/electron
    //
    // ├─┬ electron
    // │ └─┬ main.ts
    // │   └── index.ts
    // └── preload.ts
    //  ↓
    // ├─┬ dist-electron
    // │ ├─┬ electron
    // │ │ └─┬ main.js
    // │ │   └── index.js
    // │ └── preload.js
    src2dist.reduce1level = include2files(config)
      .map(file => file.replace(root + '/', ''))
      .every(file => file.includes('/'))
  }
  const file = filename.replace(root + '/', '')
  const distfile = path.posix.join(
    outDir,
    src2dist.reduce1level
      // src/main.js -> main.js
      ? file.slice(file.indexOf('/') + 1)
      : file
  )
  return relpaceTS ? distfile.replace('.ts', '.js') : distfile
}
src2dist.reduce1level = false

import fs from 'fs'
import path from 'path'
import { type ViteDevServer, normalizePath } from 'vite'
import fastGlob from 'fast-glob'
import { watch } from 'chokidar'
import { resolvePlugins } from './plugin'
import { JS_EXTENSIONS } from './utils'

export interface Configuration {
  /** Like Vite's plugin */
  plugins?: {
    name: string
    configResolved?: (config: ResolvedConfig) => void | Promise<void>
    /** Triggered by `include` file changes. You can emit some files in this hooks. */
    onwatch?: (envet: 'add' | 'change' | 'addDir' | 'unlink' | 'unlinkDir', path: string) => void
    /** Triggered by changes in `extensions` files in include */
    transform?: (args: {
      /** Raw filename */
      filename: string
      code: string
      /** Skip subsequent transform hooks */
      done: () => void
    }) => string | import('esbuild').TransformResult | void | Promise<string | import('esbuild').TransformResult | void>
    /** Triggered when `transform()` ends */
    ondone?: (args: {
      /** Raw filename */
      filename: string
      /** Dist filename */
      distname: string
    }) => void
  }[],
  /** @default process.cwd() */
  root?: string
  /** Electron-Main, Preload-Scripts */
  include: string[]
  /** @default 'dist-electron' */
  outDir?: string
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions
}

export interface ResolvedConfig {
  plugins: Required<Configuration>['plugins']
  /** @default process.cwd() */
  root: string
  /** Relative path */
  include: string[]
  /** Absolute path */
  outDir: string
  /** Options of `esbuild.transform()` */
  transformOptions: import('esbuild').TransformOptions

  config: Configuration
  /** Vite's command */
  command: 'build' | 'serve',
  /** @default ['.ts', '.tsx', '.js', '.jsx'] */
  extensions: string[]
  /** The value is `null` at build time */
  watcher: import('chokidar').FSWatcher | null
  /** The value is `null` at build time */
  viteDevServer: import('vite').ViteDevServer | null,
  /** Unstable functions */
  _fn: {
    /** Electron App startup function */
    startup: (args?: string[]) => void
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    include2dist: (filename: string, replace2js?: boolean) => string
  }
}

export type Plugin = Required<Configuration>['plugins'][number]

export async function resolveConfig(
  config: Configuration,
  command: ResolvedConfig['command'],
  viteDevServer: ViteDevServer | null = null
): Promise<ResolvedConfig> {
  // Vite hot reload vite.config.js
  process._resolved_config?.watcher?.close()

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
    plugins: resolvePlugins(config),
    root: resolvedRoot,
    include: include.map(p => path.isAbsolute(p)
      ? normalizePath(p).replace(resolvedRoot + '/', '')
      : normalizePath(p)),
    outDir: path.isAbsolute(defaultOutDir)
      ? defaultOutDir
      : path.posix.join(resolvedRoot, defaultOutDir),
    transformOptions: Object.assign({
      target: 'node14',
      // At present, Electron(20) can only support CommonJs
      format: 'cjs',
    }, transformOptions),

    config,
    command,
    extensions: JS_EXTENSIONS,
    watcher: null,
    viteDevServer,
    _fn: {
      async startup(args = ['.', '--no-sandbox']) {
        const { spawn } = await import('child_process')
        // @ts-ignore
        const electronPath = (await import('electron')).default as string

        if (process.electronApp) {
          process.electronApp.removeAllListeners()
          process.electronApp.kill()
        }

        // Start Electron.app
        process.electronApp = spawn(electronPath, args, { stdio: 'inherit' })
        // Exit command after Electron.app exits
        process.electronApp.once('exit', process.exit)
      },
      // @ts-ignore
      include2files: null,
      // @ts-ignore
      include2globs: null,
      // @ts-ignore
      include2dist: null,
    },
  }

  if (command === 'serve') {
    resolved.watcher = watch(/* 🚨 Any file */include2globs(resolved))
  }

  resolved._fn.include2files = include2files
  resolved._fn.include2globs = include2globs
  resolved._fn.include2dist = (filename: string, replace2js?: boolean) => include2dist(resolved, filename, replace2js)

  for (const plugin of resolved.plugins) {
    // call configResolved hooks
    await plugin.configResolved?.(resolved)
  }

  return process._resolved_config = resolved
}

// ----------------------------------------------------------------------

function include2files(config: ResolvedConfig, include = config.include) {
  return fastGlob
    .sync(include2globs(config, include))
    .filter(p => config.extensions.includes(path.extname(p)))
    .map(file => normalizePath(file))
}

function include2globs(config: ResolvedConfig, files = config.include) {
  const { root } = config
  return files
    .map(p => path.posix.join(root, p))
    .map(p => {
      try {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
          return path.posix.join(p, '**/*')
        }
      } catch { }
      return p
    })
}

function include2dist(
  config: ResolvedConfig,
  filename: string,
  replace2js = false,
) {
  filename = normalizePath(filename)

  const { root, outDir } = config
  if (include2dist.reduce1level === false) {
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
    include2dist.reduce1level = include2files(config)
      .map(file => file.replace(root + '/', ''))
      .every(file => file.includes('/'))
  }
  const file = filename.replace(root + '/', '')
  const distname = path.posix.join(
    outDir,
    include2dist.reduce1level
      // src/main.js -> main.js
      ? file.slice(file.indexOf('/') + 1)
      : file
  )
  const extname = path.extname(distname)
  return (replace2js && config.extensions.includes(extname)) ? distname.replace(extname, '.js') : distname
}
include2dist.reduce1level = false

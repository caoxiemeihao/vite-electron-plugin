import fs from 'node:fs'
import path from 'node:path'
import type { ViteDevServer } from 'vite'
import fastGlob from 'fast-glob'
import { watch } from 'chokidar'
import { resolvePlugins } from './plugin'
import { JS_EXTENSIONS, normalizePath } from './utils'

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
    }) => string | null | void | import('esbuild').TransformResult | Promise<string | null | void | import('esbuild').TransformResult>
    /** Triggered when `transform()` ends or a file in `extensions` is removed */
    ondone?: (args: {
      filename: string
      destname: string
    }) => void
  }[],
  /** @default process.cwd() */
  root?: string
  /** directory, filename, glob */
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
  /** Internal functions (🚨 Experimental) */
  _fn: {
    /** Electron App startup function */
    startup: (args?: string[]) => void
    /** Reload Electron-Renderer */
    reload: () => void
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    replace2dest: (filename: string, replace2js?: boolean) => string
  }
}

export type Plugin = Required<Configuration>['plugins'][number]

export async function resolveConfig(
  config: Configuration,
  command: ResolvedConfig['command'],
  viteDevServer: ViteDevServer | null = null
): Promise<ResolvedConfig> {
  // @ts-ignore
  // Vite hot reload vite.config.js
  process._resolved_config?.watcher?.close()

  const {
    root,
    include,
    outDir = 'dist-electron',
    transformOptions,
  } = config
  // https://github.com/vitejs/vite/blob/9a83eaffac3383f5ee68097807de532f0b5cb25c/packages/vite/src/node/config.ts#L456-L459
  // resolve root
  const resolvedRoot = normalizePath(
    root ? path.resolve(root) : process.cwd()
  )

  const resolved: ResolvedConfig = {
    plugins: resolvePlugins(config),
    root: resolvedRoot,
    include: include.map(p => normalizePath(p).replace(resolvedRoot + '/', '')),
    outDir: normalizePath(path.isAbsolute(outDir) ? outDir : path.join(resolvedRoot, outDir)),
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
      reload() {
        viteDevServer?.ws.send({ type: 'full-reload' })
      },
      include2files,
      include2globs,
      replace2dest: (filename: string, replace2js?: boolean) => input2output(resolved, filename, replace2js),
    },
  }

  if (command === 'serve') {
    resolved.watcher = watch(/* 🚨 Any file */include2globs(resolved))
  }

  for (const plugin of resolved.plugins) {
    // call configResolved hooks
    await plugin.configResolved?.(resolved)
  }

  // @ts-ignore
  return process._resolved_config = resolved
}

// ----------------------------------------------------------------------

function include2files(config: ResolvedConfig, include = config.include) {
  return fastGlob
    .sync(include2globs(config, include), { cwd: config.root })
    .filter(p => config.extensions.includes(path.extname(p)))
}

function include2globs(config: ResolvedConfig, files = config.include) {
  const { root } = config
  return files.map((p) =>{
    let wholePath = path.join(root, p);
    let stat = fs.statSync(wholePath);
    if (stat.isDirectory()) wholePath = path.join(wholePath, "**/*");
    return wholePath.split(path.sep).join('/');
  });
}

function input2output(
  config: ResolvedConfig,
  filename: string,
  replace2js = false,
) {
  const { root, outDir } = config
  /* if (input2output.reduce1level === false) {
    // This behavior is the same as tsc

    // e.g.
    // single - include(['electron']) -> dist-electron
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

    // e.g.
    // multiple - include(['electron', 'preload.ts]) -> dist-electron/electron
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
    input2output.reduce1level = include2files(config)
      .map(file => file.replace(root + '/', ''))
      .every(file => file.includes('/'))
  } */

  const file = normalizePath(filename).replace(root + '/', '')
  const destname = path.join(
    outDir,
    config.include.length === 1
      // If include contains only one item, it will remove 1 level of dir
      //
      // e.g. - include(['electron'])
      //   electron/main.ts -> dist-electron/main.js
      //
      // e.g. - include(['electron', 'preload.ts])
      //   electron/main.ts -> dist-electron/electron/main.js
      //   preload.ts       -> dist-electron/preload.js
      ? file.slice(file.indexOf('/') + 1)
      : file
  )
  const extname = path.extname(destname)
  return (replace2js && config.extensions.includes(extname)) ? destname.replace(extname, '.js') : destname
}

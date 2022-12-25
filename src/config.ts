import path from 'node:path'
import type { ViteDevServer, ResolvedConfig as ViteResolvedConfig, UserConfig } from 'vite'
import {
  type Configuration as Configuration2,
  type ResolvedConfig as ResolvedConfig2,
  normalizePath,
} from 'notbundle'
import { startup } from '.'

export interface Configuration extends Omit<Configuration2, 'output' | 'plugins' | 'transformOptions'> {
  /** @default 'dist-electron' */
  outDir?: string
  api?: {
    vite?: {
      config?: UserConfig
      resolvedConfig?: ViteResolvedConfig
      server?: ViteDevServer
    }
    [key: string]: any
  }
  plugins?: (Omit<NonNullable<Configuration2['plugins']>[number], 'configResolved'> &
  {
    // Overwrite `ResolvedConfig`
    configResolved?: (config: ResolvedConfig) => void | Promise<void>
  })[]
  transformOptions?: import('esbuild').TransformOptions
}

export interface ResolvedConfig extends Omit<ResolvedConfig2, 'config' | 'output' | 'plugins' | 'experimental' | 'transformOptions'> {
  config: Configuration
  /** Absolute path */
  outDir: string
  api: NonNullable<Configuration['api']>
  plugins: NonNullable<Configuration['plugins']>
  transformOptions: import('esbuild').TransformOptions
  /** Internal functions (🚨 Experimental) */
  experimental: Omit<ResolvedConfig2['experimental'], 'include2files' | 'include2globs'> & {
    // Overwrite `ResolvedConfig`
    include2files: (config: ResolvedConfig, include?: string[]) => string[]
    include2globs: (config: ResolvedConfig, include?: string[]) => string[]
    /** Electron App startup function */
    startup: (args?: string[]) => void
    /** Reload Electron-Renderer */
    reload: () => void
  }
}

export type Plugin = NonNullable<Configuration['plugins']>[number]

export function polyfillConfig(config: Configuration): Configuration {
  const {
    outDir = 'dist-electron',
    plugins = [],
  } = config
  config.plugins = [<Plugin>{
    name: 'electron:polyfill-config',
    configResolved(_config) {
      _config.outDir = normalizePath(path.isAbsolute(outDir) ? outDir : path.join(_config.root, outDir))
      _config.api = config.api ?? {}
      _config.experimental.startup = startup
      _config.experimental.reload = () => {
        _config.config.api?.vite?.server?.ws.send({ type: 'full-reload' })
      }
      // @ts-ignore
      // https://github.com/caoxiemeihao/notbundle/blob/v0.2.0/src/config.ts#L22-L26
      _config.output = _config.outDir

      // Use esbuild instead swc.
      const swc = _config.plugins.findIndex(c => c.name === ':swc')
      swc !== -1 && _config.plugins.splice(swc, 1, esbuildPlugin(_config))
    },
  }].concat(plugins)
  return config
}

function esbuildPlugin(config: ResolvedConfig): Plugin {
  console.log(config.transformOptions)
  config.transformOptions = {}
  // Electron only support cjs.
  config.transformOptions.format ??= 'cjs'
  config.transformOptions.target ??= 'node14'
  console.log(config.transformOptions)

  let esbuild: typeof import('esbuild')
  return {
    name: 'electron:esbuild',
    async transform({ filename, code }) {
      esbuild ??= (await import('esbuild'))
      const { transformOptions } = config
      return esbuild.transformSync(code, {
        loader: path.extname(filename).slice(1) as import('esbuild').Loader,
        ...transformOptions,
      })
    },
  }
}

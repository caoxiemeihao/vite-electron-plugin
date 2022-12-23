import path from 'node:path'
import type { ViteDevServer, ResolvedConfig as ViteResolvedConfig, UserConfig } from 'vite'
import { startup } from 'vite-plugin-electron'
import {
  type Configuration as Configuration2,
  type ResolvedConfig as ResolvedConfig2,
  normalizePath,
} from 'notbundle'

export interface Configuration extends Omit<Configuration2, 'output' | 'plugins'> {
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
}

export interface ResolvedConfig extends Omit<ResolvedConfig2, 'config' | 'output' | 'plugins' | 'experimental'> {
  config: Configuration
  /** Absolute path */
  outDir: string
  api: NonNullable<Configuration['api']>
  plugins: NonNullable<Configuration['plugins']>
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
    name: ':polyfill-config',
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
    },
  }].concat(plugins)
  return config
}

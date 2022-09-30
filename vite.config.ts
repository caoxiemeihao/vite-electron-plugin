import {
  type InlineConfig,
  type UserConfig,
  type BuildOptions,
  mergeConfig,
  build,
} from 'vite'
import { builtinModules } from 'module'
import pkg from './package.json'

const config: UserConfig = {
  build: {
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      external: [
        'electron',
        'esbuild',
        'vite',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...Object.keys(pkg.dependencies),
      ],
    },
  },
}

export default mergeConfig(config, {
  plugins: [{
    name: 'build-plugin',
    configResolved(config) {
      buildPlugin(config.build.watch)
    },
  }],
  build: {
    outDir: '',
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
      fileName: format => format === 'cjs' ? '[name].cjs' : '[name].js',
    },
  },
} as UserConfig)

function buildPlugin(watch: Required<BuildOptions>['watch']) {
  build(mergeConfig(config, {
    // Avoid recursive builds
    configFile: false,
    build: {
      watch,
      outDir: 'plugin',
      lib: {
        entry: 'plugin/index.ts',
        formats: ['cjs', 'es'],
        fileName: format => format === 'cjs' ? '[name].cjs' : '[name].js',
      },
    },
  } as InlineConfig))
}

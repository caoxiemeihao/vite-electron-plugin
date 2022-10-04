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
      output: {
        // Entry module "src/index.ts" is using named and default exports together.
        // Consumers of your bundle will have to use `chunk["default"]` to access the default export, which may not be what you want.
        // Use `output.exports: "named"` to disable this warning
        exports: 'named',
      },
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
      fileName: format => format === 'es' ? '[name].mjs' : '[name].js',
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
        fileName: format => format === 'es' ? '[name].mjs' : '[name].js',
      },
    },
  } as InlineConfig))
}

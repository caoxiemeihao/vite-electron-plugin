import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { builtinModules } from 'module'
import {
  type InlineConfig,
  type UserConfig,
  type BuildOptions,
  mergeConfig,
  build,
} from 'vite'
// import { COLOURS } from 'vite-plugin-utils/function' - cjs not support 😅
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
      generateTypes()
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

function generateTypes() {
  const types = path.join(__dirname, 'types')
  const types_src = path.join(__dirname, 'types/src')
  fs.rmSync(types, { recursive: true, force: true })

  return new Promise(resolve => {
    const cp = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'types'],
    )
    cp.on('exit', code => {
      // console.log(COLOURS.cyan('[types]'), 'declaration generated')
      console.log('[types]', 'declaration generated')
      resolve(code)
    })
  }).then(() => {
    const files = fs.readdirSync(types_src)
    for (const file of files) {
      const filename = path.join(types_src, file)
      fs.copyFileSync(filename, filename.replace('src', ''))
    }
    fs.rmSync(types_src, { recursive: true, force: true })
    console.log('[types]', 'declaration files moved to types')
  })
}

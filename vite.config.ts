import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: '',
    target: 'node14',
    lib: {
      entry: {
        plugin: 'src-plugin/index.ts',
        src: 'src/index.ts',
      },
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => entryName === 'plugin'
        ? (format === 'es' ? 'plugin/index.mjs' : 'plugin/index.js')
        : (format === 'es' ? 'index.mjs' : 'index.js'),
    },
    rollupOptions: {
      external: [
        'electron',
        'esbuild',
        'vite',
        'acorn',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...Object.keys('dependencies' in pkg ? pkg.dependencies as {} : {}),
      ],
      output: {
        // Entry module "src/index.ts" is using named and default exports together.
        // Consumers of your bundle will have to use `chunk["default"]` to access the default export, which may not be what you want.
        // Use `output.exports: "named"` to disable this warning
        exports: 'named',
      },
    },
  },
})

function generateTypes() {
  return new Promise(resolve => {
    const cp = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'types'],
      { stdio: 'inherit' },
    )
    cp.on('exit', code => {
      !code && console.log('[types]', 'declaration generated')
      resolve(code)
    })
    cp.on('error', process.exit)
  })
}

if (process.env.NODE_ENV !== 'test') {
  fs.rmSync('plugin', { recursive: true, force: true })
  fs.rmSync('types', { recursive: true, force: true })
  generateTypes()
}

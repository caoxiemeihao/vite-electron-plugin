/**
 * TODO: will generate additional `utils.hash.js` 🤔
 */
import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
    outDir: '',
    lib: {
      entry: {
        plugin: 'plugin/index.ts',
        src: 'src/index.ts',
      },
      formats: ['cjs', 'es'],
      fileName: format => format === 'es'
        ? '[name]/index.mjs'
        : '[name]/index.js',
    },
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
    target: 'node14',
  },
})

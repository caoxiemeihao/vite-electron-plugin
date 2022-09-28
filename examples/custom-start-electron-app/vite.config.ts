import path from 'path'
import { rmSync } from 'fs'
import { defineConfig } from 'vite'
import electron from 'vite-electron-plugin'
import { customStart } from 'vite-electron-plugin/plugin'

rmSync(path.join(__dirname, 'dist-electron'), { recursive: true, force: true })

export default defineConfig({
  plugins: [electron({
    include: [
      'electron',
    ],
    plugins: [customStart((args) => {
      args?.startup(['.', '--no-sandbox'])
    })],
  })],
})

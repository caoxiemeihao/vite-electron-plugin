import path from 'node:path'
import { rmSync } from 'node:fs'
import { defineConfig } from 'vite'
import electron from 'vite-electron-plugin'
import { esmodule } from 'vite-electron-plugin/plugin'

rmSync(path.join(__dirname, 'dist-electron'), { recursive: true, force: true })

export default defineConfig({
  plugins: [electron({
    include: [
      'electron',
    ],
    plugins: [
      esmodule({
        include: ['execa'],
      }),
    ],
  })],
})

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout
  return ((...args) => {
    // !t && fn(...args) // first call
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }) as Fn
}

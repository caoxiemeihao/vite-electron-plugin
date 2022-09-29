import fs from 'fs'
import path from 'path'
import type { ResolvedConfig } from './config'

export function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout
  return ((...args) => {
    // !t && fn(...args) // first call
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }) as Fn
}

/**
 * @see https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */
export const colours = {
  $_$: (c: number) => (str: string) => `\x1b[${c}m` + str + '\x1b[0m',
  cyan: (str: string) => colours.$_$(36)(str),
  yellow: (str: string) => colours.$_$(33)(str),
  red: (str: string) => colours.$_$(31)(str),
}

export const JS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']
export const STATIC_JS_EXTENSIONS = ['.json', '.node', '.wasm']

export function ensureDir(filename: string): string {
  const dir = path.dirname(filename)
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })

  return filename
}

export function jsType(filename: string) {
  return {
    js: JS_EXTENSIONS.some(ext => filename.endsWith(ext)),
    static: STATIC_JS_EXTENSIONS.some(ext => filename.endsWith(ext))
  }
}

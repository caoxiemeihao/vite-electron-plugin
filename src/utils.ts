import fs from 'fs'
import path from 'path'

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
  green: (str: string) => colours.$_$(32)(str),
}

export const JS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']
export const STATIC_JS_EXTENSIONS = ['.json', '.node', '.wasm']

export function ensureDir(filename: string): string {
  const dir = path.dirname(filename)
  if (!ensureDir.cache.get(dir)) {
    !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })
    ensureDir.cache.set(dir, true)
  }
  return filename
}
ensureDir.cache = new Map<string, true>()

export function jsType(filename: string) {
  return {
    js: !filename.endsWith('.d.ts') && JS_EXTENSIONS.some(ext => filename.endsWith(ext)),
    static: STATIC_JS_EXTENSIONS.some(ext => filename.endsWith(ext))
  }
}

function log(message: string, type: 'error' | 'info' | 'success' | 'warn') {
  const dict: Record<Parameters<typeof log>[1], Exclude<keyof typeof colours, '$_$'>> = {
    error: 'red',
    info: 'cyan',
    success: 'green',
    warn: 'yellow',
  }
  message = colours[dict[type]](message)
  console.log(message)
}
export const logger: Record<Parameters<typeof log>[1], (message: string) => void> = {
  error: (message: string) => log(message, 'error'),
  info: (message: string) => log(message, 'info'),
  success: (message: string) => log(message, 'success'),
  warn: (message: string) => log(message, 'warn'),
}

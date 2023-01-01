import fs from 'node:fs'
import path from 'node:path'

export function ensureDir(filename: string): string {
  const dir = path.dirname(filename)
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })
  return filename
}

export function node_modules(root: string, count = 0): string {
  if (node_modules.p) {
    return node_modules.p
  }
  const p = path.join(root, 'node_modules')
  if (fs.existsSync(p)) {
    return node_modules.p = p
  }
  if (count >= 19) {
    throw new Error('Can not found node_modules directory.')
  }
  return node_modules(path.join(root, '..'), count + 1)
}
// For ts-check
node_modules.p = ''

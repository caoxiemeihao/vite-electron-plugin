import fs from 'node:fs'
import type { ViteDevServer } from 'vite'
import {
  type Configuration,
  resolveConfig,
} from './config'
import { build } from './build'
import { ensureDir, jsType, normalizePath } from './utils'

export async function bootstrap(config: Configuration, server: ViteDevServer) {
  process.env.VITE_DEV_SERVER_URL = resolveEnv(server)!.url

  const resolved = await resolveConfig(config, server.config, server)
  const {
    _fn,
    watcher,
    plugins,
  } = resolved
  // There can't be any await statement here, it will cause `watcher.on` to miss the first trigger.
  watcher!.on('all', async (event, _filepath) => {
    const filepath = normalizePath(_filepath)
    const destpath = _fn.replace2dest(filepath, true)
    const js_type = jsType(filepath)
    let run_done = false

    // call onwatch hooks
    for (const plugin of plugins) {
      plugin.onwatch?.(event, filepath)
    }

    switch (event) {
      case 'add':
      case 'change': {
        if (js_type.js) {
          await build(resolved, filepath)
        } else if (js_type.static) {
          // static files
          fs.copyFileSync(filepath, ensureDir(destpath))
        }

        run_done = js_type.js || js_type.static
        break
      }
      case 'addDir':
        // !fs.existsSync(destpath) && fs.mkdirSync(destpath, { recursive: true })
        break
      case 'unlink':
        if (fs.existsSync(destpath)) {
          fs.unlinkSync(destpath)
          run_done = js_type.js || js_type.static
        }
        break
      case 'unlinkDir':
        fs.existsSync(destpath) && fs.rmSync(destpath, { recursive: true, force: true })
        break
    }

    if (run_done) {
      run_done = false
      for (const plugin of plugins) {
        // call ondone hooks
        plugin.ondone?.({ filename: filepath, destname: destpath })
      }
    }
  })
}

/**
 * @see https://github.com/vitejs/vite/blob/c3f6731bafeadd310efa4325cb8dcc639636fe48/packages/vite/src/node/constants.ts#L131-L141
 */
function resolveHostname(hostname: string) {
  const loopbackHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0000:0000:0000:0000:0000:0000:0000:0001'
  ])
  const wildcardHosts = new Set([
    '0.0.0.0',
    '::',
    '0000:0000:0000:0000:0000:0000:0000:0000'
  ])

  return loopbackHosts.has(hostname) || wildcardHosts.has(hostname) ? 'localhost' : hostname
}

function resolveEnv(server: ViteDevServer) {
  const addressInfo = server.httpServer!.address()
  const isAddressInfo = (x: any): x is import('net').AddressInfo => x?.address

  if (isAddressInfo(addressInfo)) {
    const { address, port } = addressInfo
    const hostname = resolveHostname(address)

    const options = server.config.server
    const protocol = options.https ? 'https' : 'http'
    const devBase = server.config.base

    const path = typeof options.open === 'string' ? options.open : devBase
    const url = path.startsWith('http')
      ? path
      : `${protocol}://${hostname}:${port}${path}`

    return { url, hostname, port }
  }
}

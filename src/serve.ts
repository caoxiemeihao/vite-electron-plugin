import fs from 'fs'
import { normalizePath, type ViteDevServer } from 'vite'
import {
  type Configuration,
  resolveConfig,
} from './config'
import { build } from './build'
import { ensuredir, STATIC_JS_EXTENSIONS } from './utils'

export async function bootstrap(config: Configuration, server: ViteDevServer) {
  process.env.VITE_DEV_SERVER_URL = resolveEnv(server)!.url

  const resolved = await resolveConfig(config, 'serve', server)
  const {
    _fn,
    watcher,
    plugins,
    extensions,
  } = resolved
  // There can't be any await statement here, it will cause `watcher.on` to miss the first trigger.
  watcher!.on('all', async (event, _filepath) => {
    const filepath = normalizePath(_filepath)
    const distpath = _fn.include2dist(filepath)

    // call onwatch hooks
    for (const plugin of plugins) {
      plugin.onwatch?.(event, filepath)
    }

    switch (event) {
      case 'add':
      case 'change': {
        const filename = filepath
        const js = extensions.some(ext => filename.endsWith(ext))
        const staticjs = STATIC_JS_EXTENSIONS.some(ext => filename.endsWith(ext))
        const distname = _fn.include2dist(filename, js)
        if (js) {
          await build(resolved, filename)
        } else if (staticjs) {
          // static files
          fs.copyFileSync(filename, ensuredir(distname))
        }

        if (js || staticjs) {
          for (const plugin of plugins) {
            // call ondone hooks
            plugin.ondone?.({ filename, distname })
          }
        }
        break
      }
      case 'addDir':
        // !fs.existsSync(distpath) && fs.mkdirSync(distpath, { recursive: true })
        break
      case 'unlink':
        fs.existsSync(distpath) && fs.unlinkSync(distpath)
        break
      case 'unlinkDir':
        fs.existsSync(distpath) && fs.rmSync(distpath, { recursive: true, force: true })
        break
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

import fs from 'fs'
import { spawn } from 'child_process'
import type { ViteDevServer } from 'vite'
import {
  type Configuration,
  type ResolvedConfig,
  extensions,
  resolveConfig,
} from './config'
import { build } from './build'

export async function bootstrap(config: Configuration, server: ViteDevServer) {
  process.env.VITE_DEV_SERVER_URL = resolveEnv(server)!.url

  const resolved = await resolveConfig(config, 'serve')
  const { watcher, src2dist, config: rawConfig } = resolved
  const startup = debounce(startupHandle)
  // There can't be any await statement here, it will cause `watcher.on` to miss the first trigger.
  watcher!.on('all', async (event, filepath) => {
    rawConfig.onwatch?.(event, filepath)

    const distpath = src2dist(filepath)
    switch (event) {
      case 'add':
      case 'change':
        await build(resolved, filepath)
        break
      case 'addDir':
        !fs.existsSync(distpath) && fs.mkdirSync(distpath, { recursive: true })
        break
      case 'unlink':
        fs.existsSync(distpath) && fs.unlinkSync(distpath)
        break
      case 'unlinkDir':
        fs.existsSync(distpath) && fs.rmSync(distpath, { recursive: true, force: true })
        break
    }

    startup(resolved, server, event, filepath)
  })

  // first start
  // watcher!.emit('add', 'add', config.include2files[0])
}

function startupHandle(
  config: ResolvedConfig,
  server: ViteDevServer,
  event: Parameters<Required<Configuration>['onstart']>[0]['event'],
  filename: string,
) {
  const { config: rawConfig } = config

  if (rawConfig.onstart) {
    // Custom Electron App startup
    rawConfig.onstart({
      filename,
      event,
      startup,
      viteDevServer: server,
    })
    return false
  }

  if (ispreload(filename)) {
    server.ws.send({ type: 'full-reload' })
  } else {
    startup()
  }
}

async function startup() {
  // @ts-ignore
  const electronPath = (await import('electron')).default as string

  if (process.electronApp) {
    process.electronApp.removeAllListeners()
    process.electronApp.kill()
  }

  // Start Electron.app
  process.electronApp = spawn(electronPath, ['.', '--no-sandbox'], { stdio: 'inherit' })
  // Exit command after Electron.app exits
  process.electronApp.once('exit', process.exit)
}

/**
 * Preload-Scripts
 * e.g.
 * - `xxx.preload.js`
 * - `xxx.preload.ts`
 */
function ispreload(fielname: string) {
  return extensions.some(ext => fielname.endsWith('preload' + ext))
}

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout
  return (...args: Parameters<Fn>) => {
    // !t && fn(...args) // first call
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
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

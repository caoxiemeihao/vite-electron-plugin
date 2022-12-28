import { app, BrowserWindow } from 'electron'
import path from 'node:path'

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ ├─┬ preload
// │ │ └── index.js
// │ ├─┬ renderer
// │ │ └── index.html

process.env.ROOT = path.join(__dirname, '../..')
process.env.DIST = path.join(process.env.ROOT, 'dist-electron')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_UR
  ? path.join(process.env.ROOT, 'public')
  : path.join(process.env.ROOT, 'dist')
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow
const preload = path.join(process.env.DIST, 'preload.js')

// From .env files
import.meta.env.VITE_TEST_STRING
import.meta.env.VITE_TEST_NUMVER
import.meta.env.VITE_TEST_BOOLEAN

function bootstrap() {
  win = new BrowserWindow({
    webPreferences: {
      preload,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.VITE_PUBLIC, 'index.html'))
  }
}

app.whenReady().then(bootstrap)

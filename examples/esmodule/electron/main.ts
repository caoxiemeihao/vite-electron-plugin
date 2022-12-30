process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { execa } from 'execa'

let win: BrowserWindow | null

app.whenReady().then(() => {
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, './preload.js')
    },
  })

  win.webContents.on('did-finish-load', async () => {
    const { stdout } = await execa('echo', ['unicorns']);
    console.log(stdout);

    // Test actively push message to the Electron-Renderer
    win?.webContents.send('main-process-message', `execa.echo -> ${stdout}`)
  })
  win.webContents.openDevTools()

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
})

app.on('window-all-closed', () => {
  win = null
})

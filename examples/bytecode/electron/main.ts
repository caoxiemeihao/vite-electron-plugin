process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

import path from 'node:path'
import { app, BrowserWindow } from 'electron'

let win: BrowserWindow | null

app.whenReady().then(() => {
  win = new BrowserWindow()

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

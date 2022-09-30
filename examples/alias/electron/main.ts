import { app, BrowserWindow } from 'electron'
import foo from '@common/foo'

app.whenReady().then(() => {
  new BrowserWindow().loadURL(process.env.VITE_DEV_SERVER_URL)
  console.log('Alias module -', foo)
})

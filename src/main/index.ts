import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { atemConnection } from './services/atemConnection'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f1013',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev) {
    mainWindow.webContents.on('console-message', (event) => {
      console.log(`[renderer:${event.level}] ${event.message}`)
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.animatem.app')

  // Grant camera permission automatically for the ATEM's UVC multiview
  // device — this is a local, purpose-built kiosk app, not a browser
  // loading third-party content, so the usual per-site prompt UX doesn't
  // apply.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  atemConnection.on('status', (status) => mainWindow.webContents.send('atem:status', status))
  atemConnection.on('snapshot', (snapshot) =>
    mainWindow.webContents.send('atem:snapshot', snapshot)
  )

  ipcMain.handle('atem:connect', (_e, host: string) => atemConnection.connect(host))
  ipcMain.handle('atem:disconnect', () => atemConnection.disconnect())
  ipcMain.handle('atem:status', () => atemConnection.getStatus())
  ipcMain.handle('atem:snapshot', () => atemConnection.getSnapshot())

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  atemConnection.disconnect()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

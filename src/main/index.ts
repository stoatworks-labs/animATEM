import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { atemConnection } from './services/atemConnection'
import { getCalibrationProfile, saveCalibrationProfile } from './services/calibrationStore'
import { deleteMemory, listMemories, saveMemory } from './services/memoryStore'
import type { AtemBoxLayout, AtemDveLayout, CalibrationProfile, Memory } from '../shared/protocol'

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

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape' && mainWindow.isKiosk()) mainWindow.setKiosk(false)
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
  atemConnection.on('error', (message) => mainWindow.webContents.send('atem:error', message))

  ipcMain.handle('atem:connect', (_e, host: string) => atemConnection.connect(host))
  ipcMain.handle('atem:disconnect', () => atemConnection.disconnect())
  ipcMain.handle('atem:status', () => atemConnection.getStatus())
  ipcMain.handle('atem:snapshot', () => atemConnection.getSnapshot())

  ipcMain.handle('atem:cut', (_e, me?: number) => atemConnection.cut(me))
  ipcMain.handle('atem:auto', (_e, me?: number) => atemConnection.autoTransition(me))
  ipcMain.handle('atem:ftb', (_e, me?: number) => atemConnection.fadeToBlack(me))
  ipcMain.handle('atem:program', (_e, input: number, me?: number) =>
    atemConnection.changeProgramInput(input, me)
  )
  ipcMain.handle('atem:preview', (_e, input: number, me?: number) =>
    atemConnection.changePreviewInput(input, me)
  )
  ipcMain.handle('atem:aux', (_e, source: number, bus?: number) =>
    atemConnection.setAuxSource(source, bus)
  )
  ipcMain.handle('atem:push-supersource', (_e, layout: AtemBoxLayout, ssrcId?: number) =>
    atemConnection.pushSuperSourceLayout(layout, ssrcId)
  )
  ipcMain.handle(
    'atem:push-dve',
    (_e, layout: AtemDveLayout, meIndex?: number, keyerIndex?: number) =>
      atemConnection.pushUpstreamKeyerDve(layout, meIndex, keyerIndex)
  )

  ipcMain.handle('calibration:get', (_e, resolutionKey: string) =>
    getCalibrationProfile(resolutionKey)
  )
  ipcMain.handle('calibration:save', (_e, profile: CalibrationProfile) =>
    saveCalibrationProfile(profile)
  )

  ipcMain.handle('memory:list', () => listMemories())
  ipcMain.handle('memory:save', (_e, memory: Memory) => saveMemory(memory))
  ipcMain.handle('memory:delete', (_e, id: string) => deleteMemory(id))

  ipcMain.handle('window:toggle-kiosk', () => {
    const next = !mainWindow.isKiosk()
    mainWindow.setKiosk(next)
    return next
  })
  ipcMain.handle('window:is-kiosk', () => mainWindow.isKiosk())

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

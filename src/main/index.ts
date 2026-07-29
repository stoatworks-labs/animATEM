import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { atemConnection } from './services/atemConnection'
import { getCalibrationProfile, saveCalibrationProfile } from './services/calibrationStore'
import { deleteMemory, listMemories, saveMemory } from './services/memoryStore'
import { controlServer } from './services/controlServer'
import type { AtemBoxLayout, AtemDveLayout, CalibrationProfile, Memory } from '../shared/protocol'
import { collectDiagnostics, init as initDiag, say } from './diag/index.js'
import { installElectronDiagnostics } from './diag/electron.js'

// Before anything that can fail, so a failure during startup is logged and
// captured like any other. An Electron app is several processes, so the
// renderer and GPU hooks go in too - neither raises anything the main
// process's uncaughtException handler can see.
initDiag({
  app: 'animatem',
  envPrefix: 'ANIMATEM',
  version: '0.1.0',
  cwd: app_diag_cwd()
})
installElectronDiagnostics()

if (process.argv.includes('--collect-diagnostics')) {
  // stdout, so it can be used in a script; logging went to stderr.
  say.info(collectDiagnostics())
  app.exit(0)
}

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
      say.info(`[renderer:${event.level}] ${event.message}`)
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
    'atem:animate-supersource',
    (_e, layout: AtemBoxLayout, ssrcId?: number, durationMs?: number) =>
      atemConnection.animateSuperSourceLayout(layout, ssrcId, durationMs)
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
  ipcMain.handle('memory:save', async (_e, memory: Memory) => {
    await saveMemory(memory)
    await controlServer.broadcastMemories()
  })
  ipcMain.handle('memory:delete', async (_e, id: string) => {
    await deleteMemory(id)
    await controlServer.broadcastMemories()
  })

  controlServer.start()

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
  controlServer.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


/** Repo root when running from source; irrelevant once packaged, where
 *  there is no .git and the git revision reads as 'unknown'. */
function app_diag_cwd(): string {
  return join(__dirname, '../../..')
}

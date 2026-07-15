import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AtemBoxLayout,
  AtemDveLayout,
  AtemSnapshot,
  CalibrationProfile,
  ConnectionStatus,
  Memory
} from '../shared/protocol'

const api = {
  atem: {
    connect: (host: string): Promise<void> => ipcRenderer.invoke('atem:connect', host),
    disconnect: (): Promise<void> => ipcRenderer.invoke('atem:disconnect'),
    getStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke('atem:status'),
    getSnapshot: (): Promise<AtemSnapshot | null> => ipcRenderer.invoke('atem:snapshot'),
    cut: (me?: number): Promise<void> => ipcRenderer.invoke('atem:cut', me),
    auto: (me?: number): Promise<void> => ipcRenderer.invoke('atem:auto', me),
    ftb: (me?: number): Promise<void> => ipcRenderer.invoke('atem:ftb', me),
    setProgram: (input: number, me?: number): Promise<void> =>
      ipcRenderer.invoke('atem:program', input, me),
    setPreview: (input: number, me?: number): Promise<void> =>
      ipcRenderer.invoke('atem:preview', input, me),
    setAux: (source: number, bus?: number): Promise<void> =>
      ipcRenderer.invoke('atem:aux', source, bus),
    pushSuperSourceLayout: (layout: AtemBoxLayout, ssrcId?: number): Promise<void> =>
      ipcRenderer.invoke('atem:push-supersource', layout, ssrcId),
    pushUpstreamKeyerDve: (
      layout: AtemDveLayout,
      meIndex?: number,
      keyerIndex?: number
    ): Promise<void> => ipcRenderer.invoke('atem:push-dve', layout, meIndex, keyerIndex),
    onStatus: (callback: (status: ConnectionStatus) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, status: ConnectionStatus): void =>
        callback(status)
      ipcRenderer.on('atem:status', listener)
      return (): void => {
        ipcRenderer.removeListener('atem:status', listener)
      }
    },
    onSnapshot: (callback: (snapshot: AtemSnapshot) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, snapshot: AtemSnapshot): void =>
        callback(snapshot)
      ipcRenderer.on('atem:snapshot', listener)
      return (): void => {
        ipcRenderer.removeListener('atem:snapshot', listener)
      }
    },
    onError: (callback: (message: string) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, message: string): void => callback(message)
      ipcRenderer.on('atem:error', listener)
      return (): void => {
        ipcRenderer.removeListener('atem:error', listener)
      }
    }
  },
  calibration: {
    get: (resolutionKey: string): Promise<CalibrationProfile | null> =>
      ipcRenderer.invoke('calibration:get', resolutionKey),
    save: (profile: CalibrationProfile): Promise<void> =>
      ipcRenderer.invoke('calibration:save', profile)
  },
  memory: {
    list: (): Promise<Memory[]> => ipcRenderer.invoke('memory:list'),
    save: (memory: Memory): Promise<void> => ipcRenderer.invoke('memory:save', memory),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('memory:delete', id)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api

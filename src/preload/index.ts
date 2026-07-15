import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AtemSnapshot, ConnectionStatus } from '../shared/protocol'

const api = {
  atem: {
    connect: (host: string): Promise<void> => ipcRenderer.invoke('atem:connect', host),
    disconnect: (): Promise<void> => ipcRenderer.invoke('atem:disconnect'),
    getStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke('atem:status'),
    getSnapshot: (): Promise<AtemSnapshot | null> => ipcRenderer.invoke('atem:snapshot'),
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
    }
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

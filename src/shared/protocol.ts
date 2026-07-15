// Shared types between main (ATEM connection + memory store) and renderer
// (UVC capture, compositor, touch UI). Kept dependency-free of atem-connection's
// own types so the renderer never needs Node-side imports.

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface AtemInput {
  id: number
  shortName: string
  longName: string
}

export interface MixEffectState {
  index: number
  programInput: number
  previewInput: number
  inTransition: boolean
}

// Field names below deliberately mirror atem-connection's own state shape
// (SuperSourceBox / UpstreamKeyerDVESettings) so IPC payloads can be passed
// through main <-> renderer without a translation layer.

export interface SuperSourceBoxState {
  index: number
  enabled: boolean
  source: number
  x: number
  y: number
  size: number
  cropped: boolean
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
}

export interface SuperSourceState {
  index: number
  boxes: SuperSourceBoxState[]
}

export interface UpstreamKeyerDveState {
  meIndex: number
  keyerIndex: number
  onAir: boolean
  fillSource: number
  cutSource: number
  positionX: number
  positionY: number
  sizeX: number
  sizeY: number
  maskEnabled: boolean
  maskTop: number
  maskBottom: number
  maskLeft: number
  maskRight: number
}

export interface MultiViewerWindowState {
  windowIndex: number
  source: number
}

export interface MultiViewerState {
  index: number
  windows: MultiViewerWindowState[]
}

export interface AtemSnapshot {
  productModel: string
  inputs: AtemInput[]
  mixEffects: MixEffectState[]
  superSources: SuperSourceState[]
  upstreamKeyerDves: UpstreamKeyerDveState[]
  auxes: Record<number, number>
  multiViewers: MultiViewerState[]
}

export type AtemBoxLayout = { boxes: Partial<SuperSourceBoxState>[] }
export type AtemDveLayout = Partial<Omit<UpstreamKeyerDveState, 'meIndex' | 'keyerIndex'>>

export type MemoryKind = 'supersource' | 'dve'

export interface SuperSourceMemory {
  id: string
  kind: 'supersource'
  name: string
  superSourceIndex: number
  layout: AtemBoxLayout
}

export interface DveMemory {
  id: string
  kind: 'dve'
  name: string
  meIndex: number
  keyerIndex: number
  layout: AtemDveLayout
}

export type Memory = SuperSourceMemory | DveMemory

// Wire protocol for the local control server (ws://127.0.0.1:CONTROL_SERVER_PORT),
// used by the Companion module — see companion-module/src/wsClient.ts, which
// mirrors these shapes (a separate npm package, so it can't import this file
// directly; keep both in sync by hand when changing this protocol).

export const CONTROL_SERVER_PORT = 51234

export type ControlOutboundMessage =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'snapshot'; snapshot: AtemSnapshot | null }
  | { type: 'memories'; memories: Memory[] }

export type ControlInboundMessage =
  | { type: 'cut'; me?: number }
  | { type: 'auto'; me?: number }
  | { type: 'ftb'; me?: number }
  | { type: 'setProgram'; input: number; me?: number }
  | { type: 'setPreview'; input: number; me?: number }
  | { type: 'setAux'; source: number; bus?: number }
  | { type: 'recallMemory'; id: string }

/** Normalized (0-1) rect within the multiview capture frame. */
export interface BoxRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CalibratedBox {
  /**
   * Which multiviewer window (settings.multiViewers[mv].windows[windowIndex])
   * this rect corresponds to. The *source* assigned to that window is read
   * live from ATEM state (state.settings.multiViewers[mv].windows[windowIndex].source)
   * rather than stored here, so recalibration isn't needed when the operator
   * reassigns a window's source from the switcher's own control panel — only
   * the box's pixel rect (fixed by the multiview layout) needs calibrating.
   */
  windowIndex: number
  rect: BoxRect
}

export interface CalibrationProfile {
  /** Keyed by `${captureWidth}x${captureHeight}` so a different capture resolution gets its own calibration. */
  resolutionKey: string
  multiViewerIndex: number
  boxes: CalibratedBox[]
}

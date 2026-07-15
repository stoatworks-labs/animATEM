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
  enabled: boolean
  fillSource: number
  x: number
  y: number
  sizeX: number
  sizeY: number
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
}

export interface AtemSnapshot {
  productModel: string
  inputs: AtemInput[]
  mixEffects: MixEffectState[]
  superSources: SuperSourceState[]
  upstreamKeyerDves: UpstreamKeyerDveState[]
  auxes: Record<number, number>
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

/** Normalized (0-1) rect within the multiview capture frame. */
export interface BoxRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CalibratedBox {
  /** ATEM input id this multiview box shows — assigned by the operator during calibration, since the Mini-series multiview layout isn't reassignable/queryable via the protocol. */
  atemInputId: number
  label: string
  rect: BoxRect
}

export interface CalibrationProfile {
  /** Keyed by `${captureWidth}x${captureHeight}` so a different capture resolution gets its own calibration. */
  resolutionKey: string
  boxes: CalibratedBox[]
}

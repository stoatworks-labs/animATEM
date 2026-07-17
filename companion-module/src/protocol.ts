// Mirrors animATEM's src/shared/protocol.ts control-server message shapes.
// This is a separate npm package from animATEM itself, so it can't import
// that file directly — keep both in sync by hand when the protocol changes.

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

export interface AtemSnapshot {
  productModel: string
  inputs: AtemInput[]
  mixEffects: MixEffectState[]
  auxes: Record<number, number>
}

export type MemoryKind = 'supersource' | 'dve'

export interface SuperSourceMemory {
  id: string
  kind: 'supersource'
  name: string
  superSourceIndex: number
}

export interface DveMemory {
  id: string
  kind: 'dve'
  name: string
  meIndex: number
  keyerIndex: number
}

export type Memory = SuperSourceMemory | DveMemory

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
  | { type: 'animateSuperSource'; id: string; durationMs?: number }

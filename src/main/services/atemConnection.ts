import { EventEmitter } from 'events'
import { Atem, Enums } from 'atem-connection'
import type { AtemState } from 'atem-connection'
import type {
  AtemBoxLayout,
  AtemDveLayout,
  AtemInput,
  AtemSnapshot,
  ConnectionStatus,
  MixEffectState,
  MultiViewerState,
  SuperSourceState,
  UpstreamKeyerDveState
} from '../../shared/protocol'

/** Exported for direct unit testing — pure transformation, no dependency on a live Atem connection. */
export function buildSnapshot(state: AtemState | undefined): AtemSnapshot | null {
  if (!state) return null

  const inputs: AtemInput[] = Object.values(state.inputs)
    .filter((input) => !!input)
    .map((input) => ({ id: input.inputId, shortName: input.shortName, longName: input.longName }))

  const mixEffects: MixEffectState[] = state.video.mixEffects
    .filter((me) => !!me)
    .map((me) => ({
      index: me.index,
      programInput: me.programInput,
      previewInput: me.previewInput,
      inTransition: me.transitionPosition.inTransition
    }))

  const superSources: SuperSourceState[] = state.video.superSources
    .filter((ss) => !!ss)
    .map((ss) => ({
      index: ss.index,
      boxes: ss.boxes.map((box, index) => (box ? { index, ...box } : null)).filter((box) => !!box)
    }))

  const upstreamKeyerDves: UpstreamKeyerDveState[] = state.video.mixEffects
    .filter((me) => !!me)
    .flatMap((me) =>
      me.upstreamKeyers
        .filter((usk) => !!usk && !!usk.dveSettings)
        .map((usk) => {
          const dve = usk!.dveSettings!
          return {
            meIndex: me!.index,
            keyerIndex: usk!.upstreamKeyerId,
            onAir: usk!.onAir,
            fillSource: usk!.fillSource,
            cutSource: usk!.cutSource,
            positionX: dve.positionX,
            positionY: dve.positionY,
            sizeX: dve.sizeX,
            sizeY: dve.sizeY,
            maskEnabled: dve.maskEnabled,
            maskTop: dve.maskTop,
            maskBottom: dve.maskBottom,
            maskLeft: dve.maskLeft,
            maskRight: dve.maskRight
          }
        })
    )

  const auxes: Record<number, number> = {}
  state.video.auxilliaries.forEach((source, index) => {
    if (source !== undefined) auxes[index] = source
  })

  const multiViewers: MultiViewerState[] = state.settings.multiViewers
    .filter((mv) => !!mv)
    .map((mv) => ({
      index: mv.index,
      windows: mv.windows
        .filter((w) => !!w)
        .map((w) => ({ windowIndex: w.windowIndex, source: w.source }))
    }))

  return {
    productModel: Enums.Model[state.info.model] ?? 'unknown',
    inputs,
    mixEffects,
    superSources,
    upstreamKeyerDves,
    auxes,
    multiViewers
  }
}

/** Wraps the ATEM Ethernet control protocol connection (atem-connection's Atem client). */
class AtemConnection extends EventEmitter {
  private atem: Atem | null = null
  private status: ConnectionStatus = 'disconnected'
  private host: string | null = null

  connect(host: string): void {
    this.teardown()
    this.host = host
    this.setStatus('connecting')

    const atem = new Atem()
    this.atem = atem

    atem.on('connected', () => {
      this.setStatus('connected')
      this.emitSnapshot()
    })
    atem.on('disconnected', () => {
      this.setStatus('disconnected')
    })
    atem.on('error', (message) => {
      this.setStatus('error')
      this.emit('error', message)
    })
    atem.on('stateChanged', () => {
      this.emitSnapshot()
    })

    atem.connect(host).catch((err: unknown) => {
      this.setStatus('error')
      this.emit('error', err instanceof Error ? err.message : String(err))
    })
  }

  disconnect(): void {
    this.teardown()
    this.setStatus('disconnected')
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getHost(): string | null {
    return this.host
  }

  getSnapshot(): AtemSnapshot | null {
    return this.atem ? buildSnapshot(this.atem.state) : null
  }

  async cut(me = 0): Promise<void> {
    await this.atem?.cut(me)
  }

  async autoTransition(me = 0): Promise<void> {
    await this.atem?.autoTransition(me)
  }

  async fadeToBlack(me = 0): Promise<void> {
    await this.atem?.fadeToBlack(me)
  }

  async changeProgramInput(input: number, me = 0): Promise<void> {
    await this.atem?.changeProgramInput(input, me)
  }

  async changePreviewInput(input: number, me = 0): Promise<void> {
    await this.atem?.changePreviewInput(input, me)
  }

  async setAuxSource(source: number, bus = 0): Promise<void> {
    await this.atem?.setAuxSource(source, bus)
  }

  /** Pushes a preview-composited SuperSource box arrangement to the real switcher ("Take"). */
  async pushSuperSourceLayout(layout: AtemBoxLayout, ssrcId = 0): Promise<void> {
    if (!this.atem) return
    await Promise.all(
      layout.boxes.map((box) => {
        if (box.index === undefined) return Promise.resolve()
        const { index, ...props } = box
        return this.atem!.setSuperSourceBoxSettings(props, index, ssrcId)
      })
    )
  }

  /** Pushes a preview-composited DVE arrangement to the real switcher ("Take"). */
  async pushUpstreamKeyerDve(layout: AtemDveLayout, meIndex = 0, keyerIndex = 0): Promise<void> {
    await this.atem?.setUpstreamKeyerDVESettings(layout, meIndex, keyerIndex)
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.emit('status', status)
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot()
    if (snapshot) this.emit('snapshot', snapshot)
  }

  private teardown(): void {
    if (this.atem) {
      this.atem.disconnect().catch(() => {})
      this.atem.removeAllListeners()
      this.atem = null
    }
  }
}

export const atemConnection = new AtemConnection()

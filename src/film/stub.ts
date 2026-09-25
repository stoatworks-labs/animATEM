/**
 * Filming harness: a stand-in for everything outside the renderer.
 *
 * animATEM's renderer talks to the world through two doors: `window.api`
 * (IPC to the main process, which owns the ATEM connection) and
 * `navigator.mediaDevices` (the switcher's multiview over USB). This file
 * replaces both, so the REAL renderer — the same React tree, compositor and
 * editors the app ships — can be run in a plain browser and filmed with no
 * switcher and nothing on the network:
 *
 *   - `window.api.atem` is a fixture switcher held in this page's memory. It
 *     never opens a socket. Connect, Take, Animate, Cut and Auto change the
 *     fixture and echo it back as a snapshot, the way the real connection
 *     echoes the switcher's state, so the Program panes follow a Take.
 *   - the capture device is a canvas drawing a synthetic multiview (colour
 *     bars, a number and a label per window, a moving bar), every window of
 *     it labelled on screen as a test pattern.
 *   - calibration and memories live in memory for the page's lifetime.
 *
 * Nothing here is loaded by the app: `src/` is excluded from the packaged
 * build (electron-builder.yml) and only `film.config.mjs` serves this. It is
 * the committed form of the throwaway harness the README screenshots were
 * made with (docs/NOTES.md, 2026-07-18). Used by stoatworks-backend's video
 * toolkit; see film.config.mjs for how to serve it.
 */
import type {
  AtemBoxLayout,
  AtemDveLayout,
  AtemSnapshot,
  CalibrationProfile,
  ConnectionStatus,
  Memory,
  SuperSourceBoxState
} from '../shared/protocol'
import { easeInOutQuad } from '../shared/easing'
import {
  DEFAULT_SUPER_SOURCE_BOX,
  applyEasing,
  interpolateSuperSourceBox,
  stepCount
} from '../shared/superSourceAnimation'

// ---------------------------------------------------------------------------
// The fixture switcher.

const INPUTS = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: n,
    shortName: `CAM${n}`,
    longName: `Camera ${n}`
  })),
  { id: 2001, shortName: 'COL1', longName: 'Color 1' },
  { id: 3010, shortName: 'MP1', longName: 'Media Player 1' },
  { id: 3020, shortName: 'MP2', longName: 'Media Player 2' },
  { id: 6000, shortName: 'SSRC', longName: 'Super Source' },
  { id: 7001, shortName: 'CLN1', longName: 'Clean Feed 1' },
  { id: 8001, shortName: 'AUX1', longName: 'Auxiliary 1' },
  { id: 10010, shortName: 'PGM', longName: 'Program' },
  { id: 10011, shortName: 'PVW', longName: 'Preview' }
]

/** Multiview windows in the order the synthetic feed draws them (LABELS below). */
const WINDOW_SOURCES = [1, 2, 3, 4, 5, 6, 7, 8, 3010, 3020, 6000, 2001, 10011, 10010, 8001, 7001]

function box(
  index: number,
  source: number,
  x: number,
  y: number,
  size: number
): SuperSourceBoxState {
  return { ...DEFAULT_SUPER_SOURCE_BOX, index, enabled: true, source, x, y, size }
}

const state: AtemSnapshot = {
  productModel: 'Filming stand-in (no switcher)',
  inputs: INPUTS,
  mixEffects: [{ index: 0, programInput: 1, previewInput: 2, inTransition: false }],
  superSources: [
    {
      index: 0,
      boxes: [
        box(0, 1, -2000, 2000, 2000),
        box(1, 2, 2000, 2000, 2000),
        box(2, 3, -2000, -2000, 2000),
        box(3, 4, 2000, -2000, 2000)
      ]
    }
  ],
  upstreamKeyerDves: [
    {
      meIndex: 0,
      keyerIndex: 0,
      onAir: true,
      fillSource: 2,
      cutSource: 2,
      positionX: 2300,
      positionY: 1500,
      sizeX: 1400,
      sizeY: 1400,
      maskEnabled: false,
      maskTop: 0,
      maskBottom: 0,
      maskLeft: 0,
      maskRight: 0
    }
  ],
  auxes: { 0: 10010 },
  multiViewers: [
    { index: 0, windows: WINDOW_SOURCES.map((source, windowIndex) => ({ windowIndex, source })) }
  ]
}

let status: ConnectionStatus = 'disconnected'
const statusListeners = new Set<(s: ConnectionStatus) => void>()
const snapshotListeners = new Set<(s: AtemSnapshot) => void>()

/** Every command the page sent, for the camera's driver to read back. Nothing else sees it. */
const sent: { command: string; args: unknown[] }[] = []
;(window as unknown as { __filmSent: typeof sent }).__filmSent = sent

function setStatus(next: ConnectionStatus): void {
  status = next
  statusListeners.forEach((l) => l(next))
}

function publish(): void {
  if (status !== 'connected') return
  const copy = structuredClone(state)
  snapshotListeners.forEach((l) => l(copy))
}

function record(command: string, ...args: unknown[]): void {
  sent.push({ command, args })
}

function mergeBoxes(ssrcId: number, layout: AtemBoxLayout): void {
  const target = state.superSources.find((s) => s.index === ssrcId)
  if (!target) return
  for (const b of layout.boxes) {
    if (b.index === undefined) continue
    const live = target.boxes.find((x) => x.index === b.index)
    if (live) Object.assign(live, b)
  }
}

let animation: ReturnType<typeof setInterval> | null = null
// atemConnection.ts: SUPER_SOURCE_ANIMATION_STEP_MS and easeInOutQuad.
const STEP_MS = 20

const api = {
  atem: {
    connect: async (host: string): Promise<void> => {
      record('connect', host)
      setStatus('connecting')
      await new Promise((r) => setTimeout(r, 400))
      setStatus('connected')
      publish()
    },
    disconnect: async (): Promise<void> => {
      record('disconnect')
      setStatus('disconnected')
    },
    getStatus: async (): Promise<ConnectionStatus> => status,
    getSnapshot: async (): Promise<AtemSnapshot | null> =>
      status === 'connected' ? structuredClone(state) : null,
    cut: async (me = 0): Promise<void> => {
      record('cut', me)
      const m = state.mixEffects[me]
      if (m) [m.programInput, m.previewInput] = [m.previewInput, m.programInput]
      publish()
    },
    auto: async (me = 0): Promise<void> => {
      record('auto', me)
      const m = state.mixEffects[me]
      if (m) [m.programInput, m.previewInput] = [m.previewInput, m.programInput]
      publish()
    },
    ftb: async (me = 0): Promise<void> => {
      record('ftb', me)
    },
    setProgram: async (input: number, me = 0): Promise<void> => {
      record('setProgram', input, me)
      if (state.mixEffects[me]) state.mixEffects[me].programInput = input
      publish()
    },
    setPreview: async (input: number, me = 0): Promise<void> => {
      record('setPreview', input, me)
      if (state.mixEffects[me]) state.mixEffects[me].previewInput = input
      publish()
    },
    setAux: async (source: number, bus = 0): Promise<void> => {
      record('setAux', source, bus)
      state.auxes[bus] = source
      publish()
    },
    pushSuperSourceLayout: async (layout: AtemBoxLayout, ssrcId = 0): Promise<void> => {
      record('pushSuperSourceLayout', layout, ssrcId)
      if (animation) clearInterval(animation)
      mergeBoxes(ssrcId, layout)
      publish()
    },
    // The same eased stream of intermediate states the main process sends a
    // real switcher (atemConnection.animateSuperSourceLayout), from the same
    // shared math, applied to the fixture step by step.
    animateSuperSourceLayout: async (
      layout: AtemBoxLayout,
      ssrcId = 0,
      durationMs = 1000
    ): Promise<void> => {
      record('animateSuperSourceLayout', layout, ssrcId, durationMs)
      if (animation) clearInterval(animation)
      const ss = state.superSources.find((s) => s.index === ssrcId)
      if (!ss) return
      const from = new Map(ss.boxes.map((b) => [b.index, { ...b }]))
      const total = stepCount(durationMs, STEP_MS)
      let step = 0
      animation = setInterval(() => {
        step++
        const t = applyEasing(step, total, easeInOutQuad)
        for (const target of layout.boxes) {
          if (target.index === undefined) continue
          const start = from.get(target.index) ?? {
            ...DEFAULT_SUPER_SOURCE_BOX,
            index: target.index
          }
          const live = ss.boxes.find((b) => b.index === target.index)
          if (live) Object.assign(live, interpolateSuperSourceBox(start, target, t))
        }
        if (step >= total) {
          if (animation) clearInterval(animation)
          animation = null
          mergeBoxes(ssrcId, layout)
        }
        publish()
      }, STEP_MS)
    },
    pushUpstreamKeyerDve: async (
      layout: AtemDveLayout,
      meIndex = 0,
      keyerIndex = 0
    ): Promise<void> => {
      record('pushUpstreamKeyerDve', layout, meIndex, keyerIndex)
      const dve = state.upstreamKeyerDves.find(
        (d) => d.meIndex === meIndex && d.keyerIndex === keyerIndex
      )
      if (dve) Object.assign(dve, layout)
      publish()
    },
    onStatus: (callback: (s: ConnectionStatus) => void) => {
      statusListeners.add(callback)
      return (): void => {
        statusListeners.delete(callback)
      }
    },
    onSnapshot: (callback: (s: AtemSnapshot) => void) => {
      snapshotListeners.add(callback)
      return (): void => {
        snapshotListeners.delete(callback)
      }
    },
    onError: () => (): void => {}
  },
  calibration: (() => {
    const profiles = new Map<string, CalibrationProfile>()
    return {
      get: async (key: string): Promise<CalibrationProfile | null> => profiles.get(key) ?? null,
      save: async (profile: CalibrationProfile): Promise<void> => {
        profiles.set(profile.resolutionKey, structuredClone(profile))
      }
    }
  })(),
  memory: (() => {
    const memories: Memory[] = []
    return {
      list: async (): Promise<Memory[]> => structuredClone(memories),
      save: async (m: Memory): Promise<void> => {
        const i = memories.findIndex((x) => x.id === m.id)
        if (i >= 0) memories[i] = m
        else memories.push(m)
      },
      delete: async (id: string): Promise<void> => {
        const i = memories.findIndex((x) => x.id === id)
        if (i >= 0) memories.splice(i, 1)
      }
    }
  })(),
  window: {
    toggleKiosk: async (): Promise<boolean> => false,
    isKiosk: async (): Promise<boolean> => false
  },
  diag: {
    collect: async (): Promise<string> => '(filming harness: no diagnostics)',
    openLogFolder: async (): Promise<string> => ''
  }
}

;(window as unknown as { api: typeof api }).api = api

// ---------------------------------------------------------------------------
// The synthetic multiview, as a camera.

const W = 1280
const H = 720
const LABELS = [
  'CAM 1',
  'CAM 2',
  'CAM 3',
  'CAM 4',
  'CAM 5',
  'CAM 6',
  'CAM 7',
  'CAM 8',
  'MEDIA 1',
  'MEDIA 2',
  'SSRC',
  'COLOUR 1',
  'PVW',
  'PGM',
  'AUX',
  'CLEAN'
]
const BARS = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf']

const canvas = document.createElement('canvas')
canvas.width = W
canvas.height = H
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
let frame = 0

/** The window whose picture a source shows: its own for CAM 1-8 and the rest, by WINDOW_SOURCES. */
function windowOf(source: number): number {
  return WINDOW_SOURCES.indexOf(source)
}

// Like a switcher's own multiview, the PVW and PGM windows show whatever the
// stand-in has on preview and program, and the source windows carry tally:
// red for program, green for preview. So a tap or a Cut shows on the feed.
const PVW_WINDOW = 12
const PGM_WINDOW = 13

function draw(): void {
  const bw = W / 4
  const bh = H / 4
  ctx.fillStyle = '#0c0c0c'
  ctx.fillRect(0, 0, W, H)
  const phase = (frame % 120) / 120
  const me = state.mixEffects[0]
  const pgm = windowOf(me.programInput)
  const pvw = windowOf(me.previewInput)
  LABELS.forEach((label, i) => {
    const cx = (i % 4) * bw
    const cy = Math.floor(i / 4) * bh
    const shows = i === PVW_WINDOW && pvw >= 0 ? pvw : i === PGM_WINDOW && pgm >= 0 ? pgm : i
    const barW = (bw - 8) / BARS.length
    BARS.forEach((_, k) => {
      ctx.fillStyle = BARS[(k + shows) % BARS.length]
      ctx.fillRect(cx + 4 + k * barW, cy + 4, barW + 0.5, bh - 44)
    })
    ctx.fillStyle = '#fff'
    ctx.fillRect(cx + 4 + phase * (bw - 14), cy + 4, 6, bh - 44)
    ctx.font = 'bold 72px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 6
    ctx.strokeStyle = '#fff'
    ctx.strokeText(String(shows + 1), cx + bw / 2, cy + (bh - 36) / 2)
    ctx.fillStyle = '#000'
    ctx.fillText(String(shows + 1), cx + bw / 2, cy + (bh - 36) / 2)
    ctx.fillStyle = '#141414'
    ctx.fillRect(cx, cy + bh - 36, bw, 36)
    ctx.textAlign = 'left'
    ctx.font = '20px Helvetica, Arial, sans-serif'
    ctx.fillStyle = '#e6e6e6'
    ctx.fillText(label, cx + 10, cy + bh - 18)
    // Every window says what it is, so no crop of it can be mistaken for a camera.
    ctx.textAlign = 'right'
    ctx.font = '13px Helvetica, Arial, sans-serif'
    ctx.fillStyle = '#9a9a9a'
    ctx.fillText('SYNTHETIC TEST PATTERN', cx + bw - 10, cy + bh - 18)
    const tally =
      i === pgm || i === PGM_WINDOW ? '#e02020' : i === pvw || i === PVW_WINDOW ? '#20c040' : null
    ctx.strokeStyle = tally ?? '#3c3c3c'
    ctx.lineWidth = tally ? 6 : 1
    ctx.strokeRect(cx + 3, cy + 3, bw - 6, bh - 6)
  })
  frame++
}

draw()
setInterval(draw, 1000 / 30)
const stream = canvas.captureStream(30)

const DEVICE: MediaDeviceInfo = {
  deviceId: 'film-synthetic-multiview',
  groupId: 'film',
  kind: 'videoinput',
  label: 'Synthetic multiview (test pattern)',
  toJSON() {
    return this
  }
}

Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  value: {
    enumerateDevices: async (): Promise<MediaDeviceInfo[]> => [DEVICE],
    // A fresh clone per call: the picker's permission probe stops the tracks
    // it is given, and the capture must not lose its stream to that.
    getUserMedia: async (): Promise<MediaStream> => stream.clone(),
    addEventListener: (): void => {},
    removeEventListener: (): void => {}
  }
})

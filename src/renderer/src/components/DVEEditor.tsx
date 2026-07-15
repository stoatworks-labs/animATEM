import { useEffect, useRef, useState } from 'react'
import { captureManager } from '../capture/captureManager'
import { SourceCompositor } from '../compositor/compositeCanvas'
import { dveToCropFraction, dveToScreenRect } from '../compositor/dveCoords'
import { normalizedToPixel } from '../compositor/boxGeometry'
import MemoryBank from './MemoryBank'
import type {
  AtemSnapshot,
  CalibrationProfile,
  Memory,
  UpstreamKeyerDveState
} from '../../../shared/protocol'

interface Props {
  snapshot: AtemSnapshot | null
  calibration: CalibrationProfile | null
}

function emptyDve(meIndex: number, keyerIndex: number): UpstreamKeyerDveState {
  return {
    meIndex,
    keyerIndex,
    onAir: false,
    fillSource: 0,
    cutSource: 0,
    positionX: 0,
    positionY: 0,
    sizeX: 2000,
    sizeY: 2000,
    maskEnabled: false,
    maskTop: 0,
    maskBottom: 0,
    maskLeft: 0,
    maskRight: 0
  }
}

function drawDve(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  compositor: SourceCompositor,
  dve: UpstreamKeyerDveState,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  const rect = dveToScreenRect(dve)
  const dest = normalizedToPixel(rect, width, height)
  compositor.drawSource(ctx, video, dve.fillSource, dest, dveToCropFraction(dve))
}

function DVEEditor({ snapshot, calibration }: Props): React.JSX.Element {
  const liveDves = snapshot?.upstreamKeyerDves ?? []
  const [meIndex, setMeIndex] = useState(0)
  const [keyerIndex, setKeyerIndex] = useState(0)
  const [dve, setDve] = useState<UpstreamKeyerDveState>(() => emptyDve(0, 0))
  const seededRef = useRef(false)

  const programCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const compositorRef = useRef(new SourceCompositor(calibration, snapshot?.multiViewers ?? []))
  const dveRef = useRef(dve)

  useEffect(() => {
    dveRef.current = dve
  }, [dve])

  useEffect(() => {
    compositorRef.current = new SourceCompositor(calibration, snapshot?.multiViewers ?? [])
  }, [calibration, snapshot])

  const liveDve = liveDves.find((d) => d.meIndex === meIndex && d.keyerIndex === keyerIndex) ?? null

  useEffect(() => {
    seededRef.current = false
  }, [meIndex, keyerIndex])

  useEffect(() => {
    if (!liveDve || seededRef.current) return
    seededRef.current = true
    setDve(liveDve)
  }, [liveDve])

  useEffect(() => {
    return captureManager.onFrame(() => {
      const video = captureManager.getVideo()
      const compositor = compositorRef.current

      const program = programCanvasRef.current
      if (program && video.videoWidth > 0 && liveDve) {
        if (program.width !== video.videoWidth) program.width = video.videoWidth
        if (program.height !== video.videoHeight) program.height = video.videoHeight
        const ctx = program.getContext('2d')
        if (ctx) drawDve(ctx, video, compositor, liveDve, program.width, program.height)
      }

      const preview = previewCanvasRef.current
      if (preview && video.videoWidth > 0) {
        if (preview.width !== video.videoWidth) preview.width = video.videoWidth
        if (preview.height !== video.videoHeight) preview.height = video.videoHeight
        const ctx = preview.getContext('2d')
        if (ctx) drawDve(ctx, video, compositor, dveRef.current, preview.width, preview.height)
      }
    })
  }, [liveDve])

  const resetToLive = (): void => {
    if (liveDve) setDve(liveDve)
  }

  const update = (patch: Partial<UpstreamKeyerDveState>): void => {
    setDve((prev) => ({ ...prev, ...patch }))
  }

  const take = async (): Promise<void> => {
    await window.api.atem.pushUpstreamKeyerDve(dve, meIndex, keyerIndex)
  }

  const recallMemory = (memory: Memory): void => {
    if (memory.kind !== 'dve') return
    setDve((prev) => ({ ...prev, ...memory.layout }))
  }

  return (
    <div className="ssrc-editor">
      <div className="ssrc-toolbar">
        <label>
          M/E
          <input
            type="number"
            min={0}
            value={meIndex}
            onChange={(e) => setMeIndex(Number(e.target.value))}
          />
        </label>
        <label>
          Keyer
          <input
            type="number"
            min={0}
            value={keyerIndex}
            onChange={(e) => setKeyerIndex(Number(e.target.value))}
          />
        </label>
        <button onClick={resetToLive} disabled={!liveDve}>
          Reset to live
        </button>
        <button className="take-button" onClick={() => void take()}>
          Take
        </button>
      </div>
      <div className="ssrc-panes">
        <div className="ssrc-pane">
          <h3>Program (live)</h3>
          <canvas ref={programCanvasRef} className="capture-canvas" />
        </div>
        <div className="ssrc-pane">
          <h3>Preview (editing)</h3>
          <canvas ref={previewCanvasRef} className="capture-canvas" />
        </div>
      </div>
      <table className="ssrc-box-table">
        <thead>
          <tr>
            <th>Fill</th>
            <th>X</th>
            <th>Y</th>
            <th>Size X</th>
            <th>Size Y</th>
            <th>Masked</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <select
                value={dve.fillSource}
                onChange={(e) => update({ fillSource: Number(e.target.value) })}
              >
                <option value={0}>—</option>
                {(snapshot?.inputs ?? []).map((input) => (
                  <option key={input.id} value={input.id}>
                    {input.shortName}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                type="number"
                value={dve.positionX}
                onChange={(e) => update({ positionX: Number(e.target.value) })}
              />
            </td>
            <td>
              <input
                type="number"
                value={dve.positionY}
                onChange={(e) => update({ positionY: Number(e.target.value) })}
              />
            </td>
            <td>
              <input
                type="number"
                value={dve.sizeX}
                onChange={(e) => update({ sizeX: Number(e.target.value) })}
              />
            </td>
            <td>
              <input
                type="number"
                value={dve.sizeY}
                onChange={(e) => update({ sizeY: Number(e.target.value) })}
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={dve.maskEnabled}
                onChange={(e) => update({ maskEnabled: e.target.checked })}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="calibration-hint">
        {
          "Position/size are raw ATEM units — the preview's visual scale is an unverified approximation (see README) pending real hardware to calibrate against. Take pushes these exact values regardless."
        }
      </p>
      <MemoryBank
        filter={(m) => m.kind === 'dve' && m.meIndex === meIndex && m.keyerIndex === keyerIndex}
        onRecall={recallMemory}
        buildMemory={(name) => ({
          id: crypto.randomUUID(),
          kind: 'dve',
          name,
          meIndex,
          keyerIndex,
          layout: dve
        })}
      />
    </div>
  )
}

export default DVEEditor

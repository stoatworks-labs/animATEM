import { useEffect, useRef, useState } from 'react'
import { captureManager } from '../capture/captureManager'
import { SourceCompositor } from '../compositor/compositeCanvas'
import { boxToCropFraction, boxToScreenRect } from '../compositor/superSourceCoords'
import { normalizedToPixel } from '../compositor/boxGeometry'
import type {
  AtemSnapshot,
  CalibrationProfile,
  SuperSourceBoxState
} from '../../../shared/protocol'

interface Props {
  snapshot: AtemSnapshot | null
  calibration: CalibrationProfile | null
}

function emptyBox(index: number): SuperSourceBoxState {
  return {
    index,
    enabled: false,
    source: 0,
    x: 0,
    y: 0,
    size: 1000,
    cropped: false,
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0
  }
}

function drawArrangement(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  compositor: SourceCompositor,
  boxes: SuperSourceBoxState[],
  width: number,
  height: number
): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  for (const box of boxes) {
    if (!box.enabled) continue
    const rect = boxToScreenRect(box)
    const dest = normalizedToPixel(rect, width, height)
    compositor.drawSource(ctx, video, box.source, dest, boxToCropFraction(box))
  }
}

function SuperSourceEditor({ snapshot, calibration }: Props): React.JSX.Element {
  const superSources = snapshot?.superSources ?? []
  const [ssrcIndex, setSsrcIndex] = useState(0)
  const [boxes, setBoxes] = useState<SuperSourceBoxState[]>([0, 1, 2, 3].map(emptyBox))
  const seededRef = useRef(false)

  const programCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const compositorRef = useRef(new SourceCompositor(calibration, snapshot?.multiViewers ?? []))
  const boxesRef = useRef(boxes)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    compositorRef.current = new SourceCompositor(calibration, snapshot?.multiViewers ?? [])
  }, [calibration, snapshot])

  const liveSuperSource = superSources.find((s) => s.index === ssrcIndex) ?? null

  useEffect(() => {
    seededRef.current = false
  }, [ssrcIndex])

  useEffect(() => {
    if (!liveSuperSource || seededRef.current) return
    seededRef.current = true
    setBoxes(
      [0, 1, 2, 3].map((i) => liveSuperSource.boxes.find((b) => b.index === i) ?? emptyBox(i))
    )
  }, [liveSuperSource])

  useEffect(() => {
    return captureManager.onFrame(() => {
      const video = captureManager.getVideo()
      const compositor = compositorRef.current

      const program = programCanvasRef.current
      if (program && video.videoWidth > 0) {
        if (program.width !== video.videoWidth) program.width = video.videoWidth
        if (program.height !== video.videoHeight) program.height = video.videoHeight
        const ctx = program.getContext('2d')
        if (ctx && liveSuperSource) {
          const liveBoxes = [0, 1, 2, 3].map(
            (i) => liveSuperSource.boxes.find((b) => b.index === i) ?? emptyBox(i)
          )
          drawArrangement(ctx, video, compositor, liveBoxes, program.width, program.height)
        }
      }

      const preview = previewCanvasRef.current
      if (preview && video.videoWidth > 0) {
        if (preview.width !== video.videoWidth) preview.width = video.videoWidth
        if (preview.height !== video.videoHeight) preview.height = video.videoHeight
        const ctx = preview.getContext('2d')
        if (ctx)
          drawArrangement(ctx, video, compositor, boxesRef.current, preview.width, preview.height)
      }
    })
  }, [liveSuperSource])

  const resetToLive = (): void => {
    if (!liveSuperSource) return
    setBoxes(
      [0, 1, 2, 3].map((i) => liveSuperSource.boxes.find((b) => b.index === i) ?? emptyBox(i))
    )
  }

  const updateBox = (index: number, patch: Partial<SuperSourceBoxState>): void => {
    setBoxes((prev) => prev.map((b) => (b.index === index ? { ...b, ...patch } : b)))
  }

  const take = async (): Promise<void> => {
    await window.api.atem.pushSuperSourceLayout({ boxes }, ssrcIndex)
  }

  return (
    <div className="ssrc-editor">
      <div className="ssrc-toolbar">
        <label>
          SuperSource
          <select value={ssrcIndex} onChange={(e) => setSsrcIndex(Number(e.target.value))}>
            {(superSources.length > 0 ? superSources.map((s) => s.index) : [0]).map((i) => (
              <option key={i} value={i}>
                SSrc {i + 1}
              </option>
            ))}
          </select>
        </label>
        <button onClick={resetToLive} disabled={!liveSuperSource}>
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
            <th>Box</th>
            <th>On</th>
            <th>Source</th>
            <th>X</th>
            <th>Y</th>
            <th>Size</th>
            <th>Cropped</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box) => (
            <tr key={box.index}>
              <td>{box.index + 1}</td>
              <td>
                <input
                  type="checkbox"
                  checked={box.enabled}
                  onChange={(e) => updateBox(box.index, { enabled: e.target.checked })}
                />
              </td>
              <td>
                <select
                  value={box.source}
                  onChange={(e) => updateBox(box.index, { source: Number(e.target.value) })}
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
                  value={box.x}
                  onChange={(e) => updateBox(box.index, { x: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={box.y}
                  onChange={(e) => updateBox(box.index, { y: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={box.size}
                  onChange={(e) => updateBox(box.index, { size: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={box.cropped}
                  onChange={(e) => updateBox(box.index, { cropped: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="calibration-hint">
        Position/size are raw ATEM units — the preview&apos;s visual scale is an unverified
        approximation (see README) pending real hardware to calibrate against. Take pushes these
        exact values regardless.
      </p>
    </div>
  )
}

export default SuperSourceEditor

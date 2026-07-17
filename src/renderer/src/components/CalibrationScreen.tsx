import { useEffect, useRef, useState } from 'react'
import { captureManager } from '../capture/captureManager'
import { useCaptureState } from '../capture/useCaptureState'
import { normalizedToPixel, rectFromCorners, resolutionKey } from '../compositor/boxGeometry'
import type { AtemSnapshot, CalibratedBox, MultiViewerWindowState } from '../../../shared/protocol'

interface Props {
  snapshot: AtemSnapshot | null
  onSaved?: (resolutionKey: string, boxes: CalibratedBox[]) => void
}

interface DragState {
  startX: number
  startY: number
  x: number
  y: number
}

const MULTI_VIEWER_INDEX = 0
const UNASSIGNED = -1

function liveWindows(snapshot: AtemSnapshot | null): MultiViewerWindowState[] {
  return snapshot?.multiViewers.find((m) => m.index === MULTI_VIEWER_INDEX)?.windows ?? []
}

function sourceNameForInput(snapshot: AtemSnapshot | null, inputId: number): string {
  const input = snapshot?.inputs.find((i) => i.id === inputId)
  return input ? input.shortName : `input ${inputId}`
}

function sourceNameForWindow(snapshot: AtemSnapshot | null, windowIndex: number): string | null {
  const win = liveWindows(snapshot).find((w) => w.windowIndex === windowIndex)
  return win ? sourceNameForInput(snapshot, win.source) : null
}

function CalibrationScreen({ snapshot, onSaved }: Props): React.JSX.Element {
  const { frameSize } = useCaptureState()
  const [boxes, setBoxes] = useState<CalibratedBox[]>([])
  const [saved, setSaved] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const boxesRef = useRef<CalibratedBox[]>([])
  const snapshotRef = useRef(snapshot)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    if (!frameSize) return
    const key = resolutionKey(frameSize.width, frameSize.height)
    window.api.calibration.get(key).then((profile) => {
      if (profile) setBoxes(profile.boxes)
    })
  }, [frameSize])

  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    frameWidth: number,
    frameHeight: number
  ): void => {
    ctx.lineWidth = 2
    ctx.font = '16px sans-serif'
    for (const box of boxesRef.current) {
      const px = normalizedToPixel(box.rect, frameWidth, frameHeight)
      const label = sourceNameForWindow(snapshotRef.current, box.windowIndex)
      ctx.strokeStyle = label ? '#4ade80' : '#f87171'
      ctx.fillStyle = ctx.strokeStyle
      ctx.strokeRect(px.x, px.y, px.width, px.height)
      ctx.fillText(label ?? 'unassigned', px.x + 4, px.y + 18)
    }
    const drag = dragRef.current
    if (drag) {
      ctx.strokeStyle = '#eab308'
      ctx.strokeRect(
        Math.min(drag.startX, drag.x),
        Math.min(drag.startY, drag.y),
        Math.abs(drag.x - drag.startX),
        Math.abs(drag.y - drag.startY)
      )
    }
  }

  useEffect(() => {
    return captureManager.onFrame(() => {
      const canvas = canvasRef.current
      const video = captureManager.getVideo()
      if (!canvas) return
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      drawOverlay(ctx, canvas.width, canvas.height)
    })
  }, [])

  const canvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const scaleX = canvas.width / bounds.width
    const scaleY = canvas.height / bounds.height
    return {
      x: (e.clientX - bounds.left) * scaleX,
      y: (e.clientY - bounds.top) * scaleY
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const point = canvasPoint(e)
    if (!point) return
    dragRef.current = { startX: point.x, startY: point.y, x: point.x, y: point.y }
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!dragRef.current) return
    const point = canvasPoint(e)
    if (!point) return
    dragRef.current = { ...dragRef.current, x: point.x, y: point.y }
  }

  const onMouseUp = (): void => {
    const drag = dragRef.current
    const canvas = canvasRef.current
    dragRef.current = null
    if (!drag || !canvas) return
    if (Math.abs(drag.x - drag.startX) < 8 || Math.abs(drag.y - drag.startY) < 8) return

    const rect = rectFromCorners(
      drag.startX,
      drag.startY,
      drag.x,
      drag.y,
      canvas.width,
      canvas.height
    )
    // Best-effort default: the first live window not already claimed by
    // another box. The operator confirms/corrects it from the dropdown by
    // matching what's actually pictured — window *numbering* order is not
    // trusted (it doesn't match visual grid position on at least some
    // models/layouts, confirmed against real hardware).
    const usedIndexes = new Set(boxesRef.current.map((b) => b.windowIndex))
    const suggestion = liveWindows(snapshotRef.current).find((w) => !usedIndexes.has(w.windowIndex))
    setBoxes((prev) => [...prev, { windowIndex: suggestion?.windowIndex ?? UNASSIGNED, rect }])
    setSaved(false)
  }

  const updateWindowIndex = (index: number, windowIndex: number): void => {
    setBoxes((prev) => prev.map((b, i) => (i === index ? { ...b, windowIndex } : b)))
    setSaved(false)
  }

  const removeBox = (index: number): void => {
    setBoxes((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  const save = async (): Promise<void> => {
    if (!frameSize) return
    const key = resolutionKey(frameSize.width, frameSize.height)
    await window.api.calibration.save({
      resolutionKey: key,
      multiViewerIndex: MULTI_VIEWER_INDEX,
      boxes
    })
    setSaved(true)
    onSaved?.(key, boxes)
  }

  const windows = liveWindows(snapshot)

  return (
    <div className="calibration-screen">
      <p className="calibration-hint">
        {
          'Draw a rectangle around each multiview box, then pick which live source it shows from the dropdown — match by what you can actually see in the box, not a guessed number. Connect to the ATEM first so the dropdown has real sources to pick from.'
        }
      </p>
      <canvas
        ref={canvasRef}
        className="capture-canvas calibration-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <table className="calibration-table">
        <thead>
          <tr>
            <th>Box</th>
            <th>This box shows…</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box, index) => (
            <tr key={index}>
              <td>#{index + 1}</td>
              <td>
                <select
                  value={box.windowIndex}
                  onChange={(e) => updateWindowIndex(index, Number(e.target.value))}
                >
                  <option value={UNASSIGNED}>{'Select the source shown in this box…'}</option>
                  {windows.map((w) => (
                    <option key={w.windowIndex} value={w.windowIndex}>
                      {sourceNameForInput(snapshot, w.source)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => removeBox(index)}>Remove</button>
              </td>
            </tr>
          ))}
          {boxes.length === 0 && (
            <tr>
              <td colSpan={3} className="calibration-empty">
                Draw a box on the picture above to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="calibration-actions">
        <button onClick={() => void save()} disabled={boxes.length === 0 || !frameSize}>
          Save calibration
        </button>
        {saved && <span className="calibration-saved">Saved.</span>}
      </div>
    </div>
  )
}

export default CalibrationScreen

import { useEffect, useRef, useState } from 'react'
import { captureManager } from '../capture/captureManager'
import { useCaptureState } from '../capture/useCaptureState'
import { normalizedToPixel, rectFromCorners, resolutionKey } from '../compositor/boxGeometry'
import type { AtemSnapshot, CalibratedBox } from '../../../shared/protocol'

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

function sourceNameForWindow(snapshot: AtemSnapshot | null, windowIndex: number): string | null {
  const mv = snapshot?.multiViewers.find((m) => m.index === MULTI_VIEWER_INDEX)
  const win = mv?.windows.find((w) => w.windowIndex === windowIndex)
  if (!win) return null
  const input = snapshot?.inputs.find((i) => i.id === win.source)
  return input ? input.shortName : `input ${win.source}`
}

function CalibrationScreen({ snapshot, onSaved }: Props): React.JSX.Element {
  const { frameSize } = useCaptureState()
  const [boxes, setBoxes] = useState<CalibratedBox[]>([])
  const [saved, setSaved] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const boxesRef = useRef<CalibratedBox[]>([])

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

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
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#4ade80'
    for (const box of boxesRef.current) {
      const px = normalizedToPixel(box.rect, frameWidth, frameHeight)
      ctx.strokeRect(px.x, px.y, px.width, px.height)
      ctx.fillText(`#${box.windowIndex}`, px.x + 4, px.y + 18)
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
    const nextWindowIndex =
      boxesRef.current.length === 0
        ? 0
        : Math.max(...boxesRef.current.map((b) => b.windowIndex)) + 1
    setBoxes((prev) => [...prev, { windowIndex: nextWindowIndex, rect }])
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

  return (
    <div className="calibration-screen">
      <p className="calibration-hint">
        {
          "Draw a rectangle around each multiview box, then confirm its window number matches the ATEM's own multiview layout (window numbering runs left-to-right, top-to-bottom). If connected, the live source assigned to that window is shown for reference."
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
            <th>Window</th>
            <th>Live source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box, index) => (
            <tr key={index}>
              <td>
                <input
                  type="number"
                  min={0}
                  value={box.windowIndex}
                  onChange={(e) => updateWindowIndex(index, Number(e.target.value))}
                />
              </td>
              <td>{sourceNameForWindow(snapshot, box.windowIndex) ?? '—'}</td>
              <td>
                <button onClick={() => removeBox(index)}>Remove</button>
              </td>
            </tr>
          ))}
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

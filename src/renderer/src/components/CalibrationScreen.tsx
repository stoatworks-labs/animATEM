import { useEffect, useRef, useState } from 'react'
import { listVideoInputs, UvcCapture } from '../capture/uvcCapture'
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [boxes, setBoxes] = useState<CalibratedBox[]>([])
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const captureRef = useRef(new UvcCapture())
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const boxesRef = useRef<CalibratedBox[]>([])

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {})
      .finally(() => {
        listVideoInputs().then(setDevices)
      })
  }, [])

  useEffect(() => {
    const capture = captureRef.current
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      capture.stop()
    }
  }, [])

  useEffect(() => {
    if (!frameSize) return
    const key = resolutionKey(frameSize.width, frameSize.height)
    window.api.calibration.get(key).then((profile) => {
      if (profile) setBoxes(profile.boxes)
    })
  }, [frameSize])

  const start = async (deviceId: string): Promise<void> => {
    setError(null)
    try {
      const stream = await captureRef.current.start(deviceId)
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      const draw = (): void => {
        const canvas = canvasRef.current
        if (canvas && video.videoWidth > 0) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            setFrameSize({ width: video.videoWidth, height: video.videoHeight })
          }
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            drawOverlay(ctx, canvas.width, canvas.height)
          }
        }
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

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
      <div className="capture-picker-controls">
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value)
            if (e.target.value) void start(e.target.value)
          }}
        >
          <option value="">{"Select the ATEM's UVC multiview device…"}</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
        {error && <span className="connection-error">{error}</span>}
      </div>
      <video ref={videoRef} muted playsInline style={{ display: 'none' }} />
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

import { useEffect, useRef } from 'react'
import { captureManager } from '../capture/captureManager'
import { normalizedToPixel } from '../compositor/boxGeometry'
import type { AtemSnapshot, CalibrationProfile } from '../../../shared/protocol'

interface Props {
  snapshot: AtemSnapshot | null
  calibration: CalibrationProfile | null
  onSourceTap: (sourceId: number) => void
}

/**
 * Fullscreen touchable view of the raw multiview feed. Draws the calibrated
 * box outlines over the live picture and resolves a tap to the ATEM source
 * currently assigned to that window (read live from snapshot.multiViewers,
 * per the calibration design — box geometry is calibrated once, source
 * assignment is always read live).
 */
function MultiviewCanvas({ snapshot, calibration, onSourceTap }: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snapshotRef = useRef(snapshot)
  const calibrationRef = useRef(calibration)

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    calibrationRef.current = calibration
  }, [calibration])

  useEffect(() => {
    return captureManager.onFrame(() => {
      const canvas = canvasRef.current
      const video = captureManager.getVideo()
      if (!canvas || video.videoWidth === 0) return
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)

      const cal = calibrationRef.current
      if (!cal) return
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)'
      ctx.lineWidth = 2
      for (const box of cal.boxes) {
        const px = normalizedToPixel(box.rect, canvas.width, canvas.height)
        ctx.strokeRect(px.x, px.y, px.width, px.height)
      }
    })
  }, [])

  const handleTap = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    const cal = calibrationRef.current
    const snap = snapshotRef.current
    if (!canvas || !cal || !snap) return

    const bounds = canvas.getBoundingClientRect()
    const x = (e.clientX - bounds.left) / bounds.width
    const y = (e.clientY - bounds.top) / bounds.height

    const box = cal.boxes.find(
      (b) =>
        x >= b.rect.x &&
        x <= b.rect.x + b.rect.width &&
        y >= b.rect.y &&
        y <= b.rect.y + b.rect.height
    )
    if (!box) return

    const mv = snap.multiViewers.find((m) => m.index === cal.multiViewerIndex)
    const window = mv?.windows.find((w) => w.windowIndex === box.windowIndex)
    if (window) onSourceTap(window.source)
  }

  return <canvas ref={canvasRef} className="capture-canvas multiview-canvas" onClick={handleTap} />
}

export default MultiviewCanvas

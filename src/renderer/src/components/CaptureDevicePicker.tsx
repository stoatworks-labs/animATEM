import { useEffect, useRef, useState } from 'react'
import { listVideoInputs, UvcCapture } from '../capture/uvcCapture'

interface Props {
  /** Called on every captured frame, with the source video element to crop/draw from. */
  onFrame?: (video: HTMLVideoElement) => void
}

function CaptureDevicePicker({ onFrame }: Props): React.JSX.Element {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const captureRef = useRef(new UvcCapture())
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Labels are only populated once permission has been granted at least
    // once, so request the default camera first, then enumerate.
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
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0)
          onFrame?.(video)
        }
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="capture-picker">
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
      <canvas ref={canvasRef} className="capture-canvas" />
    </div>
  )
}

export default CaptureDevicePicker

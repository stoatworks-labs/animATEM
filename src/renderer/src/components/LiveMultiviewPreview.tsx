import { useEffect, useRef } from 'react'
import { captureManager } from '../capture/captureManager'

/** Raw passthrough view of the shared multiview capture, no cropping/compositing. */
function LiveMultiviewPreview(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return captureManager.onFrame(() => {
      const canvas = canvasRef.current
      const video = captureManager.getVideo()
      if (!canvas) return
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      canvas.getContext('2d')?.drawImage(video, 0, 0)
    })
  }, [])

  return <canvas ref={canvasRef} className="capture-canvas" />
}

export default LiveMultiviewPreview

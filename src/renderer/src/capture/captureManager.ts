import { UvcCapture } from './uvcCapture'

type FrameListener = () => void
type StateListener = () => void

/**
 * Singleton driver for the ATEM's UVC multiview capture, owning the one
 * <video> element and the one requestAnimationFrame loop for the whole app.
 * Every view that needs the live feed (calibration, SuperSource/DVE
 * preview, the touch UI) subscribes here instead of opening its own
 * getUserMedia session — same device, one capture, many consumers drawing
 * their own crops/composites from the shared <video> element each tick.
 */
class CaptureManager {
  private capture = new UvcCapture()
  private video: HTMLVideoElement = document.createElement('video')
  private rafHandle: number | null = null
  private frameListeners = new Set<FrameListener>()
  private stateListeners = new Set<StateListener>()
  private frameSize: { width: number; height: number } | null = null
  private error: string | null = null
  private deviceId: string | null = null

  constructor() {
    this.video.muted = true
    this.video.playsInline = true
  }

  getVideo(): HTMLVideoElement {
    return this.video
  }

  getFrameSize(): { width: number; height: number } | null {
    return this.frameSize
  }

  getError(): string | null {
    return this.error
  }

  getDeviceId(): string | null {
    return this.deviceId
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  /** Called once per animation frame while a stream is live — subscribers redraw their own canvas from getVideo(). */
  onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener)
    return () => this.frameListeners.delete(listener)
  }

  async start(deviceId: string): Promise<void> {
    this.error = null
    this.deviceId = deviceId
    this.notifyState()
    try {
      const stream = await this.capture.start(deviceId)
      this.video.srcObject = stream
      await this.video.play()
      if (this.rafHandle === null) this.loop()
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err)
      this.deviceId = null
      this.notifyState()
    }
  }

  stop(): void {
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle)
    this.rafHandle = null
    this.capture.stop()
    this.deviceId = null
    this.frameSize = null
    this.notifyState()
  }

  private loop = (): void => {
    if (this.video.videoWidth > 0) {
      const width = this.video.videoWidth
      const height = this.video.videoHeight
      if (!this.frameSize || this.frameSize.width !== width || this.frameSize.height !== height) {
        this.frameSize = { width, height }
        this.notifyState()
      }
      this.frameListeners.forEach((listener) => listener())
    }
    this.rafHandle = requestAnimationFrame(this.loop)
  }

  private notifyState(): void {
    this.stateListeners.forEach((listener) => listener())
  }
}

export const captureManager = new CaptureManager()

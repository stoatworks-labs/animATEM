import { normalizedToPixel } from './boxGeometry'
import type { BoxRect, CalibrationProfile, MultiViewerState } from '../../../shared/protocol'

export interface CropFraction {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Crops a live source's sub-region out of the multiview capture frame, given
 * a calibration (box pixel rects, keyed by multiview window index) and the
 * ATEM's live window->source assignment. This is the shared primitive behind
 * both the SuperSource and DVE preview panes: composite an arbitrary
 * arrangement of real, live source pixels without touching the switcher's
 * actual SuperSource/DVE state until the operator explicitly pushes it.
 */
export class SourceCompositor {
  private sourceToRect = new Map<number, BoxRect>()

  constructor(calibration: CalibrationProfile | null, multiViewers: MultiViewerState[]) {
    if (!calibration) return
    const mv = multiViewers.find((m) => m.index === calibration.multiViewerIndex)
    if (!mv) return
    for (const box of calibration.boxes) {
      const window = mv.windows.find((w) => w.windowIndex === box.windowIndex)
      if (window) this.sourceToRect.set(window.source, box.rect)
    }
  }

  hasSource(sourceId: number): boolean {
    return this.sourceToRect.has(sourceId)
  }

  getSourceRect(sourceId: number): BoxRect | null {
    return this.sourceToRect.get(sourceId) ?? null
  }

  /**
   * Draws a source's live sub-region into a destination rect on the given
   * canvas context, optionally cropping further within the box.
   *
   * Crop fractions are assumed to be 0-1 of the source box's own size, same
   * convention as the destination rect's normalization — this hasn't been
   * verified against a real switcher's SuperSourceBox/DVE crop-value scale
   * yet (Phase 1 has no hardware access); adjust the scale here first if a
   * real ATEM turns out to use a different range (e.g. 0-16000 fixed-point).
   */
  drawSource(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    sourceId: number,
    dest: { x: number; y: number; width: number; height: number },
    crop?: CropFraction
  ): boolean {
    const rect = this.getSourceRect(sourceId)
    if (!rect || video.videoWidth === 0) return false

    const frameW = video.videoWidth
    const frameH = video.videoHeight
    const px = normalizedToPixel(rect, frameW, frameH)

    const cropTop = crop ? px.height * crop.top : 0
    const cropBottom = crop ? px.height * crop.bottom : 0
    const cropLeft = crop ? px.width * crop.left : 0
    const cropRight = crop ? px.width * crop.right : 0

    const sx = px.x + cropLeft
    const sy = px.y + cropTop
    const sWidth = Math.max(0, px.width - cropLeft - cropRight)
    const sHeight = Math.max(0, px.height - cropTop - cropBottom)
    if (sWidth <= 0 || sHeight <= 0) return false

    ctx.drawImage(video, sx, sy, sWidth, sHeight, dest.x, dest.y, dest.width, dest.height)
    return true
  }
}

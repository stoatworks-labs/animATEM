import { describe, expect, it, vi } from 'vitest'
import { SourceCompositor } from './compositeCanvas'
import type { CalibrationProfile, MultiViewerState } from '../../../shared/protocol'

const calibration: CalibrationProfile = {
  resolutionKey: '1920x1080',
  multiViewerIndex: 0,
  boxes: [
    { windowIndex: 0, rect: { x: 0, y: 0, width: 0.5, height: 0.5 } },
    { windowIndex: 1, rect: { x: 0.5, y: 0, width: 0.5, height: 0.5 } }
  ]
}

const multiViewers: MultiViewerState[] = [
  {
    index: 0,
    windows: [
      { windowIndex: 0, source: 1 },
      { windowIndex: 1, source: 2 }
    ]
  }
]

describe('SourceCompositor construction', () => {
  it('maps live sources to their calibrated box rects', () => {
    const compositor = new SourceCompositor(calibration, multiViewers)
    expect(compositor.hasSource(1)).toBe(true)
    expect(compositor.hasSource(2)).toBe(true)
    expect(compositor.hasSource(99)).toBe(false)
    expect(compositor.getSourceRect(1)).toEqual({ x: 0, y: 0, width: 0.5, height: 0.5 })
  })

  it('is empty when there is no calibration', () => {
    const compositor = new SourceCompositor(null, multiViewers)
    expect(compositor.hasSource(1)).toBe(false)
    expect(compositor.getSourceRect(1)).toBeNull()
  })

  it('is empty when the calibrated multiViewerIndex has no matching live multiViewer', () => {
    const otherProfile: CalibrationProfile = { ...calibration, multiViewerIndex: 5 }
    const compositor = new SourceCompositor(otherProfile, multiViewers)
    expect(compositor.hasSource(1)).toBe(false)
  })

  it('skips calibrated boxes whose window has no live source assignment (e.g. layout changed)', () => {
    const sparseMultiViewers: MultiViewerState[] = [
      { index: 0, windows: [{ windowIndex: 0, source: 1 }] } // window 1 missing
    ]
    const compositor = new SourceCompositor(calibration, sparseMultiViewers)
    expect(compositor.hasSource(1)).toBe(true)
    expect(compositor.hasSource(2)).toBe(false)
  })

  it('re-resolves source->rect live if a window is reassigned to a different source, without recalibration', () => {
    const reassigned: MultiViewerState[] = [
      {
        index: 0,
        windows: [
          { windowIndex: 0, source: 3 }, // was source 1
          { windowIndex: 1, source: 2 }
        ]
      }
    ]
    const compositor = new SourceCompositor(calibration, reassigned)
    expect(compositor.hasSource(1)).toBe(false)
    expect(compositor.hasSource(3)).toBe(true)
    expect(compositor.getSourceRect(3)).toEqual({ x: 0, y: 0, width: 0.5, height: 0.5 })
  })
})

describe('SourceCompositor.drawSource', () => {
  function fakeVideo(width: number, height: number): HTMLVideoElement {
    return { videoWidth: width, videoHeight: height } as unknown as HTMLVideoElement
  }

  function fakeCtx(): CanvasRenderingContext2D & { drawImage: ReturnType<typeof vi.fn> } {
    return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D & {
      drawImage: ReturnType<typeof vi.fn>
    }
  }

  it('returns false and does not draw when the source has no calibrated rect', () => {
    const compositor = new SourceCompositor(calibration, multiViewers)
    const ctx = fakeCtx()
    const drew = compositor.drawSource(ctx, fakeVideo(1920, 1080), 99, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    expect(drew).toBe(false)
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('returns false when the video has no frame yet (videoWidth 0)', () => {
    const compositor = new SourceCompositor(calibration, multiViewers)
    const ctx = fakeCtx()
    const drew = compositor.drawSource(ctx, fakeVideo(0, 0), 1, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    expect(drew).toBe(false)
  })

  it('draws the calibrated crop of the source into the destination rect', () => {
    const compositor = new SourceCompositor(calibration, multiViewers)
    const ctx = fakeCtx()
    const dest = { x: 10, y: 20, width: 200, height: 100 }
    const drew = compositor.drawSource(ctx, fakeVideo(1920, 1080), 1, dest)
    expect(drew).toBe(true)
    // source 1's calibrated rect is the top-left quadrant: (0,0)-(960,540)
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      960,
      540,
      dest.x,
      dest.y,
      dest.width,
      dest.height
    )
  })

  it('applies crop fractions within the calibrated box before drawing', () => {
    const compositor = new SourceCompositor(calibration, multiViewers)
    const ctx = fakeCtx()
    const dest = { x: 0, y: 0, width: 100, height: 100 }
    compositor.drawSource(ctx, fakeVideo(1920, 1080), 1, dest, {
      top: 0.1,
      bottom: 0,
      left: 0.1,
      right: 0
    })
    // box is 960x540 starting at (0,0); 10% crop off the top and left
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      96,
      54,
      864,
      486,
      dest.x,
      dest.y,
      dest.width,
      dest.height
    )
  })
})

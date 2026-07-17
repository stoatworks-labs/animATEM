import { describe, expect, it } from 'vitest'
import { normalizedToPixel, pixelToNormalized, rectFromCorners, resolutionKey } from './boxGeometry'

describe('resolutionKey', () => {
  it('formats width and height as WxH', () => {
    expect(resolutionKey(1920, 1080)).toBe('1920x1080')
  })
})

describe('pixelToNormalized / normalizedToPixel', () => {
  it('round-trips a pixel rect through normalized space', () => {
    const px = { x: 480, y: 270, width: 960, height: 540 }
    const normalized = pixelToNormalized(px, 1920, 1080)
    expect(normalized).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 })

    const back = normalizedToPixel(normalized, 1920, 1080)
    expect(back).toEqual(px)
  })

  it('normalizedToPixel scales a full-frame rect to the frame size', () => {
    const px = normalizedToPixel({ x: 0, y: 0, width: 1, height: 1 }, 1280, 720)
    expect(px).toEqual({ x: 0, y: 0, width: 1280, height: 720 })
  })
})

describe('rectFromCorners', () => {
  const frameW = 1000
  const frameH = 1000

  it('normalizes two corner points regardless of drag direction', () => {
    const topLeftToBottomRight = rectFromCorners(100, 100, 300, 400, frameW, frameH)
    const bottomRightToTopLeft = rectFromCorners(300, 400, 100, 100, frameW, frameH)
    expect(topLeftToBottomRight).toEqual(bottomRightToTopLeft)
    expect(topLeftToBottomRight).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.3 })
  })

  it('clamps to the frame bounds when the drag goes outside it', () => {
    const rect = rectFromCorners(-500, -500, 1500, 1500, frameW, frameH)
    expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })

  it('produces a zero-size rect for a click with no drag', () => {
    const rect = rectFromCorners(200, 200, 200, 200, frameW, frameH)
    expect(rect).toEqual({ x: 0.2, y: 0.2, width: 0, height: 0 })
  })
})

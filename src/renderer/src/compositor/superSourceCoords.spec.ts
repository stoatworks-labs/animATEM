import { describe, expect, it } from 'vitest'
import {
  boxToCropFraction,
  boxToScreenRect,
  screenPositionToBoxXY,
  screenSizeToBoxSize
} from './superSourceCoords'
import type { SuperSourceBoxState } from '../../../shared/protocol'

function box(overrides: Partial<SuperSourceBoxState> = {}): SuperSourceBoxState {
  return {
    index: 0,
    enabled: true,
    source: 1,
    x: 0,
    y: 0,
    size: 1000,
    cropped: false,
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    ...overrides
  }
}

describe('boxToScreenRect', () => {
  it('centers a box with x=0,y=0 in the middle of the frame', () => {
    const rect = boxToScreenRect(box())
    expect(rect.x + rect.width / 2).toBeCloseTo(0.5)
    expect(rect.y + rect.height / 2).toBeCloseTo(0.5)
  })

  it('moves right on screen for positive x, and up on screen for positive y (ATEM y is inverted vs. screen y)', () => {
    const right = boxToScreenRect(box({ x: 1000 }))
    const base = boxToScreenRect(box())
    expect(right.x).toBeGreaterThan(base.x)

    const up = boxToScreenRect(box({ y: 1000 }))
    expect(up.y).toBeLessThan(base.y)
  })
})

describe('box coordinate round-trip', () => {
  it('recovers the original x/y/size after converting to a screen rect and back', () => {
    const original = box({ x: -1200, y: 800, size: 1500 })
    const rect = boxToScreenRect(original)
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2

    const { x, y } = screenPositionToBoxXY(centerX, centerY)
    const size = screenSizeToBoxSize(rect.width)

    expect(x).toBeCloseTo(original.x)
    expect(y).toBeCloseTo(original.y)
    expect(size).toBeCloseTo(original.size)
  })
})

describe('boxToCropFraction', () => {
  it('returns undefined when the box is not cropped', () => {
    expect(boxToCropFraction(box({ cropped: false, cropTop: 400 }))).toBeUndefined()
  })

  it('converts raw crop values to 0-1 fractions when cropped', () => {
    const fraction = boxToCropFraction(
      box({ cropped: true, cropTop: 400, cropBottom: 0, cropLeft: 200, cropRight: 100 })
    )
    expect(fraction).toEqual({ top: 0.1, bottom: 0, left: 0.05, right: 0.025 })
  })
})

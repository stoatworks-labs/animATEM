import { describe, expect, it } from 'vitest'
import { linear } from './easing'
import {
  applyEasing,
  DEFAULT_SUPER_SOURCE_BOX,
  interpolateSuperSourceBox,
  stepCount
} from './superSourceAnimation'

describe('interpolateSuperSourceBox', () => {
  const from = { ...DEFAULT_SUPER_SOURCE_BOX, enabled: true, x: 0, y: 0, size: 1000, source: 1 }

  it('returns the exact starting geometry at t=0', () => {
    const to = { x: 2000, y: -2000, size: 2000 }
    expect(interpolateSuperSourceBox(from, to, 0)).toMatchObject({ x: 0, y: 0, size: 1000 })
  })

  it('returns the exact target geometry at t=1', () => {
    const to = { x: 2000, y: -2000, size: 2000 }
    expect(interpolateSuperSourceBox(from, to, 1)).toMatchObject({ x: 2000, y: -2000, size: 2000 })
  })

  it('interpolates linearly at the midpoint', () => {
    const to = { x: 2000, y: -2000, size: 2000 }
    expect(interpolateSuperSourceBox(from, to, 0.5)).toMatchObject({
      x: 1000,
      y: -1000,
      size: 1500
    })
  })

  it('always reports enabled: true mid-animation, even when the target turns the box off', () => {
    const to = { enabled: false }
    expect(interpolateSuperSourceBox(from, to, 0.5).enabled).toBe(true)
  })

  it('snaps discrete fields (source, cropped) to the target immediately', () => {
    const to = { source: 7, cropped: true }
    const mid = interpolateSuperSourceBox(from, to, 0.1)
    expect(mid.source).toBe(7)
    expect(mid.cropped).toBe(true)
  })

  it('holds a field steady when the target omits it', () => {
    const mid = interpolateSuperSourceBox(from, {}, 0.5)
    expect(mid).toMatchObject({ x: 0, y: 0, size: 1000, source: 1 })
  })
})

describe('stepCount', () => {
  it('divides duration by the step interval, rounded', () => {
    expect(stepCount(1000, 20)).toBe(50)
    expect(stepCount(500, 20)).toBe(25)
  })

  it('is never less than 1, even for a zero or tiny duration', () => {
    expect(stepCount(0, 20)).toBe(1)
    expect(stepCount(5, 20)).toBe(1)
  })
})

describe('applyEasing', () => {
  it('clamps progress to 1 once the step count is reached', () => {
    expect(applyEasing(10, 10, linear)).toBe(1)
    expect(applyEasing(15, 10, linear)).toBe(1)
  })

  it('passes fractional progress through the easing function', () => {
    expect(applyEasing(5, 10, linear)).toBeCloseTo(0.5)
  })
})

import { describe, expect, it } from 'vitest'
import { easeInOutCubic, easeInOutQuad, linear } from './easing'

describe.each([
  ['linear', linear],
  ['easeInOutQuad', easeInOutQuad],
  ['easeInOutCubic', easeInOutCubic]
])('%s', (_name, easing) => {
  it('maps 0 to 0 and 1 to 1', () => {
    expect(easing(0)).toBeCloseTo(0)
    expect(easing(1)).toBeCloseTo(1)
  })

  it('is monotonically non-decreasing', () => {
    let prev = -Infinity
    for (let t = 0; t <= 1; t += 0.05) {
      const value = easing(t)
      expect(value).toBeGreaterThanOrEqual(prev)
      prev = value
    }
  })
})

describe('linear', () => {
  it('passes t straight through', () => {
    expect(linear(0.3)).toBe(0.3)
  })
})

describe('easeInOutQuad', () => {
  it('is symmetric around the midpoint', () => {
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5)
  })
})

describe('easeInOutCubic', () => {
  it('is symmetric around the midpoint', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
  })
})

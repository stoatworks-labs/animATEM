import { describe, expect, it } from 'vitest'
import {
  dveToCropFraction,
  dveToScreenRect,
  screenPositionToDveXY,
  screenSizeToDveSize
} from './dveCoords'
import type { UpstreamKeyerDveState } from '../../../shared/protocol'

function dve(overrides: Partial<UpstreamKeyerDveState> = {}): UpstreamKeyerDveState {
  return {
    meIndex: 0,
    keyerIndex: 0,
    onAir: false,
    fillSource: 1,
    cutSource: 0,
    positionX: 0,
    positionY: 0,
    sizeX: 2000,
    sizeY: 2000,
    maskEnabled: false,
    maskTop: 0,
    maskBottom: 0,
    maskLeft: 0,
    maskRight: 0,
    ...overrides
  }
}

describe('dveToScreenRect', () => {
  it('supports independent sizeX/sizeY, unlike SuperSource boxes', () => {
    const rect = dveToScreenRect(dve({ sizeX: 4000, sizeY: 1000 }))
    expect(rect.width).toBeCloseTo(1)
    expect(rect.height).toBeCloseTo(0.25)
  })
})

describe('DVE position/size round-trip', () => {
  it('recovers positionX/positionY/sizeX/sizeY after converting to a screen rect and back', () => {
    const original = dve({ positionX: 600, positionY: -900, sizeX: 1200, sizeY: 2400 })
    const rect = dveToScreenRect(original)
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2

    const { x, y } = screenPositionToDveXY(centerX, centerY)
    expect(x).toBeCloseTo(original.positionX)
    expect(y).toBeCloseTo(original.positionY)
    expect(screenSizeToDveSize(rect.width)).toBeCloseTo(original.sizeX)
    expect(screenSizeToDveSize(rect.height)).toBeCloseTo(original.sizeY)
  })
})

describe('dveToCropFraction', () => {
  it('returns undefined when masking is disabled', () => {
    expect(dveToCropFraction(dve({ maskEnabled: false, maskTop: 400 }))).toBeUndefined()
  })

  it('converts raw mask values to 0-1 fractions when masking is enabled', () => {
    const fraction = dveToCropFraction(
      dve({ maskEnabled: true, maskTop: 400, maskBottom: 0, maskLeft: 200, maskRight: 100 })
    )
    expect(fraction).toEqual({ top: 0.1, bottom: 0, left: 0.05, right: 0.025 })
  })
})

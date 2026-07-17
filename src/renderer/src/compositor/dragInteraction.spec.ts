import { describe, expect, it } from 'vitest'
import { applyDrag, hitTestBoxes, type DragTarget } from './dragInteraction'

const box: DragTarget<number> = { id: 1, rect: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 } }

describe('hitTestBoxes', () => {
  it('returns null when the point is outside every box', () => {
    expect(hitTestBoxes([box], { x: 0.05, y: 0.05 })).toBeNull()
  })

  it('reports a move hit for a point inside the box interior', () => {
    const hit = hitTestBoxes([box], { x: 0.4, y: 0.4 })
    expect(hit).toEqual({ id: 1, mode: 'move' })
  })

  it('reports a resize hit with the correct corner near a handle', () => {
    // se corner is at (0.5, 0.5)
    const hit = hitTestBoxes([box], { x: 0.5, y: 0.5 })
    expect(hit).toEqual({ id: 1, mode: 'resize', corner: 'se' })
  })

  it('prefers corner handles over the interior when both are in range', () => {
    // nw corner (0.3, 0.3) is also inside the box interior
    const hit = hitTestBoxes([box], { x: 0.3, y: 0.3 })
    expect(hit).toEqual({ id: 1, mode: 'resize', corner: 'nw' })
  })

  it('picks the topmost (last) box when two overlap', () => {
    const behind: DragTarget<number> = { id: 1, rect: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 } }
    const front: DragTarget<number> = { id: 2, rect: { x: 0.35, y: 0.35, width: 0.2, height: 0.2 } }
    const hit = hitTestBoxes([behind, front], { x: 0.4, y: 0.4 })
    expect(hit?.id).toBe(2)
  })
})

describe('applyDrag', () => {
  const startRect = { x: 0.3, y: 0.3, width: 0.2, height: 0.2 }

  it('moves the box by the pointer delta, keeping its size', () => {
    const origin = { rect: startRect, pointer: { x: 0.4, y: 0.4 } }
    const result = applyDrag(origin, 'move', undefined, { x: 0.5, y: 0.35 }, false)
    expect(result.x).toBeCloseTo(0.4)
    expect(result.y).toBeCloseTo(0.25)
    expect(result.width).toBe(0.2)
    expect(result.height).toBe(0.2)
  })

  it('resizing from the se corner grows the box and keeps nw anchored', () => {
    const origin = { rect: startRect, pointer: { x: 0.5, y: 0.5 } } // se corner
    const result = applyDrag(origin, 'resize', 'se', { x: 0.6, y: 0.55 }, false)
    expect(result.x).toBeCloseTo(0.3)
    expect(result.y).toBeCloseTo(0.3)
    expect(result.width).toBeCloseTo(0.3)
    expect(result.height).toBeCloseTo(0.25)
  })

  it('resizing from the nw corner keeps the opposite (se) corner anchored', () => {
    const origin = { rect: startRect, pointer: { x: 0.3, y: 0.3 } } // nw corner
    const result = applyDrag(origin, 'resize', 'nw', { x: 0.25, y: 0.25 }, false)
    // the se corner (0.5, 0.5) must not move
    expect(result.x + result.width).toBeCloseTo(0.5)
    expect(result.y + result.height).toBeCloseTo(0.5)
    expect(result.x).toBeCloseTo(0.25)
    expect(result.y).toBeCloseTo(0.25)
  })

  it('keepSquare forces width and height to match, anchored at the fixed corner', () => {
    const origin = { rect: startRect, pointer: { x: 0.5, y: 0.5 } } // se corner
    // drag further right than down -> width > height before squaring
    const result = applyDrag(origin, 'resize', 'se', { x: 0.7, y: 0.55 }, true)
    expect(result.width).toBe(result.height)
    expect(result.x).toBeCloseTo(0.3) // nw (fixed corner for 'se' drag) stays put
    expect(result.y).toBeCloseTo(0.3)
  })

  it('never shrinks a resize below the minimum size', () => {
    const origin = { rect: startRect, pointer: { x: 0.5, y: 0.5 } }
    const result = applyDrag(origin, 'resize', 'se', { x: 0.31, y: 0.31 }, false)
    expect(result.width).toBeGreaterThanOrEqual(0.03)
    expect(result.height).toBeGreaterThanOrEqual(0.03)
  })
})

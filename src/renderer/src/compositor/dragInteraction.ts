import type { BoxRect } from '../../../shared/protocol'

export type DragMode = 'move' | 'resize'
export type Corner = 'nw' | 'ne' | 'sw' | 'se'

export interface DragTarget<Id> {
  id: Id
  rect: BoxRect
}

export interface HitResult<Id> {
  id: Id
  mode: DragMode
  corner?: Corner
}

export interface DragOrigin {
  rect: BoxRect
  pointer: { x: number; y: number }
}

const HANDLE_HIT_RADIUS = 0.025
const MIN_SIZE = 0.03

/** Hit-tests a normalized point against box rects, corner handles first (topmost box wins on overlap). */
export function hitTestBoxes<Id>(
  targets: DragTarget<Id>[],
  point: { x: number; y: number }
): HitResult<Id> | null {
  for (let i = targets.length - 1; i >= 0; i--) {
    const { id, rect } = targets[i]
    const corners: Array<[Corner, number, number]> = [
      ['nw', rect.x, rect.y],
      ['ne', rect.x + rect.width, rect.y],
      ['sw', rect.x, rect.y + rect.height],
      ['se', rect.x + rect.width, rect.y + rect.height]
    ]
    for (const [corner, cx, cy] of corners) {
      if (
        Math.abs(point.x - cx) <= HANDLE_HIT_RADIUS &&
        Math.abs(point.y - cy) <= HANDLE_HIT_RADIUS
      ) {
        return { id, mode: 'resize', corner }
      }
    }
  }
  for (let i = targets.length - 1; i >= 0; i--) {
    const { id, rect } = targets[i]
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    ) {
      return { id, mode: 'move' }
    }
  }
  return null
}

/**
 * Applies a drag gesture to a box's starting rect. For resize, the corner
 * opposite the one being dragged stays anchored. `keepSquare` is used for
 * SuperSource boxes (a single `size` field — width and height must match);
 * DVE boxes resize width/height independently.
 */
export function applyDrag(
  origin: DragOrigin,
  mode: DragMode,
  corner: Corner | undefined,
  pointer: { x: number; y: number },
  keepSquare: boolean
): BoxRect {
  const dx = pointer.x - origin.pointer.x
  const dy = pointer.y - origin.pointer.y
  const start = origin.rect

  if (mode === 'move') {
    return { ...start, x: start.x + dx, y: start.y + dy }
  }

  let { x, y, width, height } = start
  switch (corner) {
    case 'se':
      width += dx
      height += dy
      break
    case 'nw':
      x += dx
      width -= dx
      y += dy
      height -= dy
      break
    case 'ne':
      width += dx
      y += dy
      height -= dy
      break
    case 'sw':
      x += dx
      width -= dx
      height += dy
      break
  }

  if (keepSquare) {
    const size = Math.max(MIN_SIZE, Math.max(width, height))
    if (corner === 'nw') {
      x = start.x + start.width - size
      y = start.y + start.height - size
    } else if (corner === 'ne') {
      y = start.y + start.height - size
    } else if (corner === 'sw') {
      x = start.x + start.width - size
    }
    width = size
    height = size
  } else {
    width = Math.max(MIN_SIZE, width)
    height = Math.max(MIN_SIZE, height)
  }

  return { x, y, width, height }
}

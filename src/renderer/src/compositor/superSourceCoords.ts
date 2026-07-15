import type { BoxRect, SuperSourceBoxState } from '../../../shared/protocol'
import type { CropFraction } from './compositeCanvas'

/**
 * SuperSourceBox's x/y/size/crop* are transmitted as raw Int16/UInt16 wire
 * values (confirmed from atem-connection's SuperSourceBoxParametersCommand
 * serializer) — but their real-world scale (what a given number means in
 * on-screen position/size) isn't documented anywhere reachable without a
 * real switcher to test against, so this conversion is a labeled best-effort
 * guess for the *preview visualization only*. It has no bearing on
 * correctness of what gets pushed to the switcher on Take — that sends the
 * exact raw values the operator set, untouched. Revisit this scale once
 * tested against real hardware (see README "Status").
 */
const COORD_RANGE = 4000

export function boxToScreenRect(box: SuperSourceBoxState): BoxRect {
  const size = Math.max(0, box.size / COORD_RANGE)
  const centerX = 0.5 + box.x / (COORD_RANGE * 2)
  const centerY = 0.5 - box.y / (COORD_RANGE * 2)
  return {
    x: centerX - size / 2,
    y: centerY - size / 2,
    width: size,
    height: size
  }
}

/** Inverse of boxToScreenRect's centering math — used to turn a drag gesture in normalized screen space back into raw x/y/size for updateBox(). */
export function screenPositionToBoxXY(centerX: number, centerY: number): { x: number; y: number } {
  return {
    x: (centerX - 0.5) * COORD_RANGE * 2,
    y: (0.5 - centerY) * COORD_RANGE * 2
  }
}

export function screenSizeToBoxSize(normalizedSize: number): number {
  return Math.max(0, normalizedSize * COORD_RANGE)
}

export function boxToCropFraction(box: SuperSourceBoxState): CropFraction | undefined {
  if (!box.cropped) return undefined
  return {
    top: box.cropTop / COORD_RANGE,
    bottom: box.cropBottom / COORD_RANGE,
    left: box.cropLeft / COORD_RANGE,
    right: box.cropRight / COORD_RANGE
  }
}

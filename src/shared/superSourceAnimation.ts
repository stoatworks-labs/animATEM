// The ATEM protocol has no native SuperSource tweening -
// SuperSourceBoxParametersCommand applies x/y/size/crop instantly, unlike an
// Upstream Keyer DVE's hardware fly-keyframes/rate. Animating a SuperSource
// box move therefore has to be done client-side: stream a sequence of eased
// intermediate box states at a fixed cadence. This module is the pure "given
// a live box and a target, what should this instant look like" math -
// atemConnection.animateSuperSourceLayout owns the timer loop and the actual
// network calls.

import type { SuperSourceBoxState } from './protocol'
import type { EasingFn } from './easing'

/** Sensible starting point for a box with no live state to animate from (e.g. newly enabled). */
export const DEFAULT_SUPER_SOURCE_BOX: Omit<SuperSourceBoxState, 'index'> = {
  enabled: false,
  source: 0,
  x: 0,
  y: 0,
  size: 1000,
  cropped: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0
}

/**
 * One animation frame's worth of box properties, `t` (0-1) of the way from
 * `from` to `to`. Only geometry is interpolated - `enabled`/`source`/`cropped`
 * are discrete, so they snap to the target immediately (the box is kept
 * enabled for the whole animation regardless of the target's `enabled`, so a
 * box turning off animates its geometry smoothly and only actually disables
 * in the final, exact command the caller sends once t reaches 1).
 */
export function interpolateSuperSourceBox(
  from: Omit<SuperSourceBoxState, 'index'>,
  to: Partial<SuperSourceBoxState>,
  t: number
): Partial<SuperSourceBoxState> {
  const lerp = (a: number, b: number): number => Math.round(a + (b - a) * t)
  return {
    enabled: true,
    source: to.source ?? from.source,
    x: lerp(from.x, to.x ?? from.x),
    y: lerp(from.y, to.y ?? from.y),
    size: lerp(from.size, to.size ?? from.size),
    cropped: to.cropped ?? from.cropped,
    cropTop: lerp(from.cropTop, to.cropTop ?? from.cropTop),
    cropBottom: lerp(from.cropBottom, to.cropBottom ?? from.cropBottom),
    cropLeft: lerp(from.cropLeft, to.cropLeft ?? from.cropLeft),
    cropRight: lerp(from.cropRight, to.cropRight ?? from.cropRight)
  }
}

/** How many discrete steps a duration breaks into at the given step interval - at least 1. */
export function stepCount(durationMs: number, stepMs: number): number {
  return Math.max(1, Math.round(durationMs / stepMs))
}

export function applyEasing(step: number, totalSteps: number, easing: EasingFn): number {
  return easing(Math.min(1, step / totalSteps))
}

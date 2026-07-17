// Pure easing curves for animated SuperSource/DVE moves. Kept dependency-free
// (no tweening library) and shared rather than renderer- or main-only, since
// both the client-side SuperSource interpolation loop (main process) and any
// future preview-side animation playback (renderer) can reuse the same math.

export type EasingFn = (t: number) => number

export const linear: EasingFn = (t) => t

export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

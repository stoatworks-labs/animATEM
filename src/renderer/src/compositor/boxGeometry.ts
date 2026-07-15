import type { BoxRect } from '../../../shared/protocol'

export function resolutionKey(width: number, height: number): string {
  return `${width}x${height}`
}

export function pixelToNormalized(
  px: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): BoxRect {
  return {
    x: px.x / frameWidth,
    y: px.y / frameHeight,
    width: px.width / frameWidth,
    height: px.height / frameHeight
  }
}

export function normalizedToPixel(
  rect: BoxRect,
  frameWidth: number,
  frameHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x * frameWidth,
    y: rect.y * frameHeight,
    width: rect.width * frameWidth,
    height: rect.height * frameHeight
  }
}

/** Normalizes a drag gesture's two corner points into a positive-size rect, clamped to the 0-1 frame. */
export function rectFromCorners(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  frameWidth: number,
  frameHeight: number
): BoxRect {
  const left = Math.max(0, Math.min(x1, x2))
  const top = Math.max(0, Math.min(y1, y2))
  const right = Math.min(frameWidth, Math.max(x1, x2))
  const bottom = Math.min(frameHeight, Math.max(y1, y2))
  return pixelToNormalized(
    { x: left, y: top, width: right - left, height: bottom - top },
    frameWidth,
    frameHeight
  )
}

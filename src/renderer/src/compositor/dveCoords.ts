import type { BoxRect, UpstreamKeyerDveState } from '../../../shared/protocol'
import type { CropFraction } from './compositeCanvas'

/**
 * Same caveat as superSourceCoords.ts: UpstreamKeyerDVESettings' positionX/
 * positionY/sizeX/sizeY/mask* are raw wire values (confirmed field names
 * from atem-connection's state types — positionX/positionY/sizeX/sizeY, not
 * SuperSource's x/y/size) but their real-world scale is unverified without
 * hardware. Preview-only; Take pushes the operator's exact raw values.
 */
const COORD_RANGE = 4000

export function dveToScreenRect(
  dve: Pick<UpstreamKeyerDveState, 'positionX' | 'positionY' | 'sizeX' | 'sizeY'>
): BoxRect {
  const width = Math.max(0, dve.sizeX / COORD_RANGE)
  const height = Math.max(0, dve.sizeY / COORD_RANGE)
  const centerX = 0.5 + dve.positionX / (COORD_RANGE * 2)
  const centerY = 0.5 - dve.positionY / (COORD_RANGE * 2)
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  }
}

export function dveToCropFraction(
  dve: Pick<
    UpstreamKeyerDveState,
    'maskEnabled' | 'maskTop' | 'maskBottom' | 'maskLeft' | 'maskRight'
  >
): CropFraction | undefined {
  if (!dve.maskEnabled) return undefined
  return {
    top: dve.maskTop / COORD_RANGE,
    bottom: dve.maskBottom / COORD_RANGE,
    left: dve.maskLeft / COORD_RANGE,
    right: dve.maskRight / COORD_RANGE
  }
}

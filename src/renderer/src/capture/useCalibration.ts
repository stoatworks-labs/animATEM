import { useEffect, useState } from 'react'
import type { CalibrationProfile } from '../../../shared/protocol'
import { resolutionKey } from '../compositor/boxGeometry'

/** Fetches the saved CalibrationProfile for the current capture resolution; pass a bumped `version` to refetch after saving a new calibration. */
export function useCalibration(
  frameSize: { width: number; height: number } | null,
  version = 0
): CalibrationProfile | null {
  const [profile, setProfile] = useState<CalibrationProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    const lookup = frameSize
      ? window.api.calibration.get(resolutionKey(frameSize.width, frameSize.height))
      : Promise.resolve(null)
    lookup.then((p) => {
      if (!cancelled) setProfile(p)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameSize?.width, frameSize?.height, version])

  return profile
}

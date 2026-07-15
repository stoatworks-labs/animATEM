import { useEffect, useReducer } from 'react'
import { captureManager } from './captureManager'

export interface CaptureState {
  deviceId: string | null
  frameSize: { width: number; height: number } | null
  error: string | null
}

/** Reactively tracks captureManager's low-frequency state (device/size/error) — not per-frame, which stays imperative. */
export function useCaptureState(): CaptureState {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0)

  useEffect(() => captureManager.onState(forceUpdate), [])

  return {
    deviceId: captureManager.getDeviceId(),
    frameSize: captureManager.getFrameSize(),
    error: captureManager.getError()
  }
}

import { useEffect, useState } from 'react'
import MultiviewCanvas from './MultiviewCanvas'
import FunctionKeyRow, { type TapMode } from './FunctionKeyRow'
import type { AtemSnapshot, CalibrationProfile } from '../../../shared/protocol'

interface Props {
  snapshot: AtemSnapshot | null
  calibration: CalibrationProfile | null
}

/** The primary touchscreen operator surface: composited multiview + function keys below it. */
function TouchScreen({ snapshot, calibration }: Props): React.JSX.Element {
  const [mode, setMode] = useState<TapMode>('preview')
  const [isKiosk, setIsKiosk] = useState(false)

  useEffect(() => {
    window.api.window.isKiosk().then(setIsKiosk)
  }, [])

  const handleSourceTap = (sourceId: number): void => {
    if (mode === 'preview') void window.api.atem.setPreview(sourceId)
    else void window.api.atem.setProgram(sourceId)
  }

  const toggleKiosk = async (): Promise<void> => {
    setIsKiosk(await window.api.window.toggleKiosk())
  }

  return (
    <div className="touch-screen">
      {calibration ? (
        <MultiviewCanvas
          snapshot={snapshot}
          calibration={calibration}
          onSourceTap={handleSourceTap}
        />
      ) : (
        <div className="touch-screen-uncalibrated">
          No calibration for the current capture resolution yet — visit the Calibrate tab first.
        </div>
      )}
      <FunctionKeyRow
        mode={mode}
        onModeChange={setMode}
        onCut={() => void window.api.atem.cut()}
        onAuto={() => void window.api.atem.auto()}
        onFtb={() => void window.api.atem.ftb()}
        isKiosk={isKiosk}
        onToggleKiosk={() => void toggleKiosk()}
      />
    </div>
  )
}

export default TouchScreen

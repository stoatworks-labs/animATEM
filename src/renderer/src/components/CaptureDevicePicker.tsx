import { useEffect, useState } from 'react'
import { listVideoInputs } from '../capture/uvcCapture'
import { captureManager } from '../capture/captureManager'
import { useCaptureState } from '../capture/useCaptureState'

function CaptureDevicePicker(): React.JSX.Element {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const { deviceId, error } = useCaptureState()

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {})
      .finally(() => {
        listVideoInputs().then(setDevices)
      })
  }, [])

  return (
    <div className="capture-picker-controls">
      <select
        value={deviceId ?? ''}
        onChange={(e) => {
          if (e.target.value) void captureManager.start(e.target.value)
        }}
      >
        <option value="">{"Select the ATEM's UVC multiview device…"}</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
      {error && <span className="connection-error">{error}</span>}
    </div>
  )
}

export default CaptureDevicePicker

import { useEffect, useState } from 'react'
import type { AtemSnapshot, ConnectionStatus } from '../../shared/protocol'
import { useCaptureState } from './capture/useCaptureState'
import { useCalibration } from './capture/useCalibration'
import ConnectionSettings from './components/ConnectionSettings'
import CaptureDevicePicker from './components/CaptureDevicePicker'
import LiveMultiviewPreview from './components/LiveMultiviewPreview'
import CalibrationScreen from './components/CalibrationScreen'
import SuperSourceEditor from './components/SuperSourceEditor'

type View = 'live' | 'calibrate' | 'supersource'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [snapshot, setSnapshot] = useState<AtemSnapshot | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [view, setView] = useState<View>('live')
  const [calibrationVersion, setCalibrationVersion] = useState(0)

  const { frameSize } = useCaptureState()
  const calibration = useCalibration(frameSize, calibrationVersion)

  useEffect(() => {
    const offStatus = window.api.atem.onStatus(setStatus)
    const offSnapshot = window.api.atem.onSnapshot(setSnapshot)
    const offError = window.api.atem.onError(setLastError)
    return () => {
      offStatus()
      offSnapshot()
      offError()
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>animATEM</h1>
        <span className="status-pill" data-status={status}>
          {status}
        </span>
        <nav className="view-tabs">
          <button className={view === 'live' ? 'active' : ''} onClick={() => setView('live')}>
            Live
          </button>
          <button
            className={view === 'calibrate' ? 'active' : ''}
            onClick={() => setView('calibrate')}
          >
            Calibrate
          </button>
          <button
            className={view === 'supersource' ? 'active' : ''}
            onClick={() => setView('supersource')}
          >
            SuperSource
          </button>
        </nav>
        <CaptureDevicePicker />
        <ConnectionSettings status={status} lastError={lastError} />
      </header>
      <div className="app-body">
        {view === 'live' && (
          <>
            <LiveMultiviewPreview />
            {snapshot ? (
              <pre className="snapshot-dump">{JSON.stringify(snapshot, null, 2)}</pre>
            ) : (
              'Connect to a switcher to get started.'
            )}
          </>
        )}
        {view === 'calibrate' && (
          <CalibrationScreen
            snapshot={snapshot}
            onSaved={() => setCalibrationVersion((v) => v + 1)}
          />
        )}
        {view === 'supersource' && (
          <SuperSourceEditor snapshot={snapshot} calibration={calibration} />
        )}
      </div>
    </div>
  )
}

export default App

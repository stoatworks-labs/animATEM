import { useEffect, useState } from 'react'
import type { AtemSnapshot, ConnectionStatus } from '../../shared/protocol'
import ConnectionSettings from './components/ConnectionSettings'
import CaptureDevicePicker from './components/CaptureDevicePicker'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [snapshot, setSnapshot] = useState<AtemSnapshot | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

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
        <ConnectionSettings status={status} lastError={lastError} />
      </header>
      <div className="app-body">
        <CaptureDevicePicker />
        {snapshot ? (
          <pre className="snapshot-dump">{JSON.stringify(snapshot, null, 2)}</pre>
        ) : (
          'Connect to a switcher to get started.'
        )}
      </div>
    </div>
  )
}

export default App

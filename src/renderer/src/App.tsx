import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '../../shared/protocol'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    return window.api.atem.onStatus(setStatus)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>animATEM</h1>
        <span className="status-pill" data-status={status}>
          {status}
        </span>
      </header>
      <div className="app-body">Connect to a switcher to get started.</div>
    </div>
  )
}

export default App

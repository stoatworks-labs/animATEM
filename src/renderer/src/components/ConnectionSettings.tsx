import { useState } from 'react'
import type { ConnectionStatus } from '../../../shared/protocol'

interface Props {
  status: ConnectionStatus
  lastError: string | null
}

function ConnectionSettings({ status, lastError }: Props): React.JSX.Element {
  const [host, setHost] = useState('192.168.1.100')

  const connect = (): void => {
    void window.api.atem.connect(host)
  }

  const disconnect = (): void => {
    void window.api.atem.disconnect()
  }

  return (
    <div className="connection-settings">
      <input
        type="text"
        value={host}
        onChange={(e) => setHost(e.target.value)}
        placeholder="ATEM IP address"
        disabled={status === 'connecting' || status === 'connected'}
      />
      {status === 'connected' || status === 'connecting' ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
      {lastError && status === 'error' && <span className="connection-error">{lastError}</span>}
    </div>
  )
}

export default ConnectionSettings

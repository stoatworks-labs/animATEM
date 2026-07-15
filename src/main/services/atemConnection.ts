import { EventEmitter } from 'events'
import type { AtemSnapshot, ConnectionStatus } from '../../shared/protocol'

/**
 * Wraps the ATEM Ethernet control protocol connection. Stubbed for now —
 * Phase 1 task 2 replaces the internals with a real `atem-connection` Atem
 * client; this shape (status/state events, connect/disconnect) is expected
 * to stay stable so the renderer/IPC layer built against it doesn't change.
 */
class AtemConnection extends EventEmitter {
  private status: ConnectionStatus = 'disconnected'
  private host: string | null = null

  connect(host: string): void {
    this.host = host
    this.status = 'connecting'
    this.emit('status', this.status satisfies ConnectionStatus)
  }

  disconnect(): void {
    this.status = 'disconnected'
    this.emit('status', this.status satisfies ConnectionStatus)
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getHost(): string | null {
    return this.host
  }

  getSnapshot(): AtemSnapshot | null {
    return null
  }
}

export const atemConnection = new AtemConnection()

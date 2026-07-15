import WebSocket from 'ws'
import type { AtemSnapshot, ConnectionStatus, ControlInboundMessage, Memory } from './protocol.js'

export interface WsClientEvents {
  onOpen?: () => void
  onClose?: () => void
  onStatus?: (status: ConnectionStatus) => void
  onSnapshot?: (snapshot: AtemSnapshot | null) => void
  onMemories?: (memories: Memory[]) => void
}

const RECONNECT_DELAY_MS = 3000

/** Reconnecting WebSocket client for animATEM's local control server. */
export class AnimatemClient {
  private socket: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private stopped = false

  constructor(
    private host: string,
    private port: number,
    private events: WsClientEvents
  ) {}

  start(): void {
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
  }

  send(message: ControlInboundMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  private connect(): void {
    const socket = new WebSocket(`ws://${this.host}:${this.port}`)
    this.socket = socket

    socket.on('open', () => this.events.onOpen?.())

    socket.on('message', (raw) => {
      try {
        const text = Array.isArray(raw)
          ? Buffer.concat(raw).toString('utf-8')
          : Buffer.isBuffer(raw)
            ? raw.toString('utf-8')
            : Buffer.from(raw).toString('utf-8')
        const message = JSON.parse(text)
        switch (message.type) {
          case 'status':
            this.events.onStatus?.(message.status)
            break
          case 'snapshot':
            this.events.onSnapshot?.(message.snapshot)
            break
          case 'memories':
            this.events.onMemories?.(message.memories)
            break
        }
      } catch {
        // ignore malformed frames
      }
    })

    socket.on('close', () => {
      this.events.onClose?.()
      this.scheduleReconnect()
    })

    socket.on('error', () => {
      // 'close' always follows 'error' for ws — reconnect is scheduled there
    })
  }

  private scheduleReconnect(): void {
    if (this.stopped) return
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
  }
}

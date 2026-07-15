import { WebSocket, WebSocketServer, type RawData } from 'ws'
import { CONTROL_SERVER_PORT } from '../../shared/protocol'
import type { ControlInboundMessage, ControlOutboundMessage } from '../../shared/protocol'
import { atemConnection } from './atemConnection'
import { listMemories } from './memoryStore'

/**
 * Local control server for third-party control surfaces (the companion-module/
 * package talks to this). Kept deliberately separate from the renderer's IPC
 * bridge — this is a network-facing surface, the renderer's is not.
 */
class ControlServer {
  private wss: WebSocketServer | null = null

  start(): void {
    if (this.wss) return

    const wss = new WebSocketServer({ host: '127.0.0.1', port: CONTROL_SERVER_PORT })
    this.wss = wss

    wss.on('connection', (socket) => {
      void this.sendInitialState(socket)
      socket.on('message', (raw) => void this.handleMessage(raw))
    })

    atemConnection.on('status', (status) => this.broadcast({ type: 'status', status }))
    atemConnection.on('snapshot', (snapshot) => this.broadcast({ type: 'snapshot', snapshot }))
  }

  stop(): void {
    this.wss?.close()
    this.wss = null
  }

  async broadcastMemories(): Promise<void> {
    const memories = await listMemories()
    this.broadcast({ type: 'memories', memories })
  }

  private async sendInitialState(socket: WebSocket): Promise<void> {
    this.send(socket, { type: 'status', status: atemConnection.getStatus() })
    this.send(socket, { type: 'snapshot', snapshot: atemConnection.getSnapshot() })
    this.send(socket, { type: 'memories', memories: await listMemories() })
  }

  private send(socket: WebSocket, message: ControlOutboundMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  private broadcast(message: ControlOutboundMessage): void {
    this.wss?.clients.forEach((client) => this.send(client, message))
  }

  private async handleMessage(raw: RawData): Promise<void> {
    let message: ControlInboundMessage
    try {
      message = JSON.parse(raw.toString())
    } catch {
      return
    }

    try {
      switch (message.type) {
        case 'cut':
          await atemConnection.cut(message.me)
          break
        case 'auto':
          await atemConnection.autoTransition(message.me)
          break
        case 'ftb':
          await atemConnection.fadeToBlack(message.me)
          break
        case 'setProgram':
          await atemConnection.changeProgramInput(message.input, message.me)
          break
        case 'setPreview':
          await atemConnection.changePreviewInput(message.input, message.me)
          break
        case 'setAux':
          await atemConnection.setAuxSource(message.source, message.bus)
          break
        case 'recallMemory':
          await this.recallMemory(message.id)
          break
      }
    } catch (err) {
      // A bad/unsupported command from a control surface shouldn't crash the
      // server or drop the connection — log and keep going.
      console.error('[controlServer] command failed', err)
    }
  }

  /**
   * Unlike the editor UI (recall into an editable Preview, never straight to
   * air), a Companion button press is a physical, immediate action — same as
   * recalling a memory bank on real switcher hardware — so this pushes
   * straight to the switcher.
   */
  private async recallMemory(id: string): Promise<void> {
    const memories = await listMemories()
    const memory = memories.find((m) => m.id === id)
    if (!memory) return
    if (memory.kind === 'supersource') {
      await atemConnection.pushSuperSourceLayout(memory.layout, memory.superSourceIndex)
    } else {
      await atemConnection.pushUpstreamKeyerDve(memory.layout, memory.meIndex, memory.keyerIndex)
    }
  }
}

export const controlServer = new ControlServer()

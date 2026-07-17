import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Memory } from '../../shared/protocol'

vi.mock('ws', () => {
  class MockWebSocket {
    static OPEN = 1
    static CLOSED = 3
    readyState = MockWebSocket.OPEN
    sent: string[] = []
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

    on(event: string, handler: (...args: unknown[]) => void): void {
      ;(this.listeners[event] ??= []).push(handler)
    }

    send(data: string): void {
      this.sent.push(data)
    }

    emit(event: string, ...args: unknown[]): void {
      this.listeners[event]?.forEach((h) => h(...args))
    }
  }

  class MockWebSocketServer {
    static instances: MockWebSocketServer[] = []
    clients = new Set<MockWebSocket>()
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

    constructor() {
      MockWebSocketServer.instances.push(this)
    }

    on(event: string, handler: (...args: unknown[]) => void): void {
      ;(this.listeners[event] ??= []).push(handler)
    }

    connectClient(socket: MockWebSocket): void {
      this.clients.add(socket)
      this.listeners['connection']?.forEach((h) => h(socket))
    }

    close(): void {
      // no-op — the real close is fire-and-forget from controlServer's perspective
    }
  }

  return { WebSocket: MockWebSocket, WebSocketServer: MockWebSocketServer }
})

vi.mock('./atemConnection', async () => {
  const { EventEmitter } = await import('events')
  class FakeAtemConnection extends EventEmitter {
    getStatus = vi.fn(() => 'connected')
    getSnapshot = vi.fn(() => null)
    cut = vi.fn()
    autoTransition = vi.fn()
    fadeToBlack = vi.fn()
    changeProgramInput = vi.fn()
    changePreviewInput = vi.fn()
    setAuxSource = vi.fn()
    pushSuperSourceLayout = vi.fn()
    pushUpstreamKeyerDve = vi.fn()
  }
  return { atemConnection: new FakeAtemConnection() }
})

vi.mock('./memoryStore', () => ({
  listMemories: vi.fn(async () => [])
}))

const wsModule = await import('ws')
const { atemConnection } = await import('./atemConnection')
const { listMemories } = await import('./memoryStore')
const { controlServer } = await import('./controlServer')

const MockWebSocketServer = wsModule.WebSocketServer as unknown as {
  instances: Array<{
    connectClient: (socket: unknown) => void
    close: () => void
  }>
}
const MockWebSocket = wsModule.WebSocket as unknown as new () => {
  readyState: number
  sent: string[]
  emit: (event: string, ...args: unknown[]) => void
}

function connectSocket(): {
  readyState: number
  sent: string[]
  emit: (e: string, ...a: unknown[]) => void
} {
  const socket = new MockWebSocket()
  MockWebSocketServer.instances[MockWebSocketServer.instances.length - 1].connectClient(socket)
  return socket
}

beforeEach(() => {
  MockWebSocketServer.instances.length = 0
  vi.mocked(listMemories).mockResolvedValue([])
  controlServer.start()
})

afterEach(() => {
  controlServer.stop()
  // controlServer.start() re-subscribes to atemConnection's events each
  // time; without this, listeners pile up across tests and each later
  // emit() fires every stale listener from every earlier test.
  atemConnection.removeAllListeners()
  vi.clearAllMocks()
})

function sentMessages(socket: { sent: string[] }): unknown[] {
  return socket.sent.map((s) => JSON.parse(s))
}

describe('controlServer', () => {
  it('sends status, snapshot, and memories to a client immediately on connect', async () => {
    vi.mocked(listMemories).mockResolvedValue([
      { id: '1', kind: 'supersource', name: 'Wide', superSourceIndex: 0, layout: { boxes: [] } }
    ])
    const socket = connectSocket()
    await vi.waitFor(() => expect(socket.sent).toHaveLength(3))

    const messages = sentMessages(socket)
    expect(messages).toContainEqual({ type: 'status', status: 'connected' })
    expect(messages).toContainEqual({ type: 'snapshot', snapshot: null })
    expect(messages[2]).toMatchObject({ type: 'memories' })
  })

  it('broadcasts a status change from atemConnection to every connected client', () => {
    const a = connectSocket()
    const b = connectSocket()
    a.sent.length = 0
    b.sent.length = 0

    atemConnection.emit('status', 'error')

    expect(sentMessages(a)).toContainEqual({ type: 'status', status: 'error' })
    expect(sentMessages(b)).toContainEqual({ type: 'status', status: 'error' })
  })

  it('does not send to a client whose socket is not open', () => {
    const socket = connectSocket()
    socket.sent.length = 0
    socket.readyState = 3 // CLOSED

    atemConnection.emit('status', 'error')

    expect(socket.sent).toHaveLength(0)
  })

  it.each([
    ['cut', { type: 'cut', me: 1 }, 'cut', [1]],
    ['auto', { type: 'auto', me: 2 }, 'autoTransition', [2]],
    ['ftb', { type: 'ftb' }, 'fadeToBlack', [undefined]],
    ['setProgram', { type: 'setProgram', input: 3, me: 0 }, 'changeProgramInput', [3, 0]],
    ['setPreview', { type: 'setPreview', input: 4, me: 1 }, 'changePreviewInput', [4, 1]],
    ['setAux', { type: 'setAux', source: 5, bus: 0 }, 'setAuxSource', [5, 0]]
  ] as const)('routes a %s command to atemConnection.%s', async (_label, message, method, args) => {
    const socket = connectSocket()
    socket.emit('message', Buffer.from(JSON.stringify(message)))
    await vi.waitFor(() => expect(atemConnection[method]).toHaveBeenCalled())
    expect(atemConnection[method]).toHaveBeenCalledWith(...args)
  })

  it('ignores a malformed message instead of crashing the server', async () => {
    const socket = connectSocket()
    expect(() => socket.emit('message', Buffer.from('not json'))).not.toThrow()
    // give any dangling microtasks a chance to run before asserting silence
    await Promise.resolve()
    expect(atemConnection.cut).not.toHaveBeenCalled()
  })

  it('recallMemory pushes a SuperSource memory straight to the switcher', async () => {
    const memory: Memory = {
      id: 'm1',
      kind: 'supersource',
      name: 'Wide',
      superSourceIndex: 2,
      layout: { boxes: [{ index: 0, enabled: true }] }
    }
    vi.mocked(listMemories).mockResolvedValue([memory])

    const socket = connectSocket()
    socket.emit('message', Buffer.from(JSON.stringify({ type: 'recallMemory', id: 'm1' })))

    await vi.waitFor(() => expect(atemConnection.pushSuperSourceLayout).toHaveBeenCalled())
    expect(atemConnection.pushSuperSourceLayout).toHaveBeenCalledWith(memory.layout, 2)
  })

  it('recallMemory pushes a DVE memory straight to the switcher', async () => {
    const memory: Memory = {
      id: 'm2',
      kind: 'dve',
      name: 'PiP',
      meIndex: 0,
      keyerIndex: 1,
      layout: { positionX: 100 }
    }
    vi.mocked(listMemories).mockResolvedValue([memory])

    const socket = connectSocket()
    socket.emit('message', Buffer.from(JSON.stringify({ type: 'recallMemory', id: 'm2' })))

    await vi.waitFor(() => expect(atemConnection.pushUpstreamKeyerDve).toHaveBeenCalled())
    expect(atemConnection.pushUpstreamKeyerDve).toHaveBeenCalledWith(memory.layout, 0, 1)
  })

  it('recallMemory with an unknown id is a no-op, not an error', async () => {
    vi.mocked(listMemories).mockResolvedValue([])
    const socket = connectSocket()
    socket.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 'recallMemory', id: 'does-not-exist' }))
    )

    await Promise.resolve()
    await Promise.resolve()
    expect(atemConnection.pushSuperSourceLayout).not.toHaveBeenCalled()
    expect(atemConnection.pushUpstreamKeyerDve).not.toHaveBeenCalled()
  })

  it('broadcastMemories fetches the current list and sends it to every client', async () => {
    const socket = connectSocket()
    // wait out the connect-time status/snapshot/memories burst before
    // clearing, or its async memories message can land after we clear
    await vi.waitFor(() => expect(socket.sent).toHaveLength(3))
    socket.sent.length = 0

    vi.mocked(listMemories).mockResolvedValue([
      { id: '1', kind: 'supersource', name: 'Wide', superSourceIndex: 0, layout: { boxes: [] } }
    ])

    await controlServer.broadcastMemories()

    expect(sentMessages(socket)).toEqual([
      {
        type: 'memories',
        memories: [
          { id: '1', kind: 'supersource', name: 'Wide', superSourceIndex: 0, layout: { boxes: [] } }
        ]
      }
    ])
  })
})

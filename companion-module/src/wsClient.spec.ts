import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('ws', () => {
  class MockWebSocket {
    static OPEN = 1
    static CLOSED = 3
    static instances: MockWebSocket[] = []

    readyState = MockWebSocket.OPEN
    url: string
    sent: string[] = []
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

    constructor(url: string) {
      this.url = url
      MockWebSocket.instances.push(this)
    }

    on(event: string, handler: (...args: unknown[]) => void): void {
      ;(this.listeners[event] ??= []).push(handler)
    }

    send(data: string): void {
      this.sent.push(data)
    }

    close(): void {
      this.readyState = MockWebSocket.CLOSED
      this.emit('close')
    }

    emit(event: string, ...args: unknown[]): void {
      this.listeners[event]?.forEach((h) => h(...args))
    }
  }

  return { default: MockWebSocket }
})

const wsModule = (await import('ws')) as unknown as {
  default: {
    new (url: string): {
      readyState: number
      url: string
      sent: string[]
      close(): void
      emit(event: string, ...args: unknown[]): void
    }
    OPEN: number
    CLOSED: number
    instances: Array<{
      readyState: number
      url: string
      sent: string[]
      close(): void
      emit(event: string, ...args: unknown[]): void
    }>
  }
}
const MockWebSocket = wsModule.default

const { AnimatemClient } = await import('./wsClient.js')

beforeEach(() => {
  MockWebSocket.instances.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AnimatemClient', () => {
  it('connects to ws://host:port and fires onOpen', () => {
    const onOpen = vi.fn()
    const client = new AnimatemClient('127.0.0.1', 51234, { onOpen })
    client.start()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://127.0.0.1:51234')

    MockWebSocket.instances[0].emit('open')
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('dispatches status/snapshot/memories messages to the matching callback', () => {
    const onStatus = vi.fn()
    const onSnapshot = vi.fn()
    const onMemories = vi.fn()
    const client = new AnimatemClient('127.0.0.1', 51234, { onStatus, onSnapshot, onMemories })
    client.start()
    const socket = MockWebSocket.instances[0]

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'status', status: 'connected' })))
    expect(onStatus).toHaveBeenCalledWith('connected')

    const snapshot = { productModel: 'ATEM Mini', inputs: [], mixEffects: [], auxes: {} }
    socket.emit('message', Buffer.from(JSON.stringify({ type: 'snapshot', snapshot })))
    expect(onSnapshot).toHaveBeenCalledWith(snapshot)

    const memories = [{ id: '1', kind: 'supersource', name: 'Wide', superSourceIndex: 0 }]
    socket.emit('message', Buffer.from(JSON.stringify({ type: 'memories', memories })))
    expect(onMemories).toHaveBeenCalledWith(memories)
  })

  it('handles an array of Buffers (fragmented frame) the same as a single Buffer', () => {
    const onStatus = vi.fn()
    const client = new AnimatemClient('127.0.0.1', 51234, { onStatus })
    client.start()
    const socket = MockWebSocket.instances[0]

    const json = JSON.stringify({ type: 'status', status: 'error' })
    const half = Math.floor(json.length / 2)
    socket.emit('message', [Buffer.from(json.slice(0, half)), Buffer.from(json.slice(half))])

    expect(onStatus).toHaveBeenCalledWith('error')
  })

  it('silently ignores a malformed message instead of throwing', () => {
    const onStatus = vi.fn()
    const client = new AnimatemClient('127.0.0.1', 51234, { onStatus })
    client.start()
    const socket = MockWebSocket.instances[0]

    expect(() => socket.emit('message', Buffer.from('not json'))).not.toThrow()
    expect(onStatus).not.toHaveBeenCalled()
  })

  it('send() writes JSON to the socket when open', () => {
    const client = new AnimatemClient('127.0.0.1', 51234, {})
    client.start()
    const socket = MockWebSocket.instances[0]

    client.send({ type: 'cut', me: 0 })
    expect(socket.sent).toEqual([JSON.stringify({ type: 'cut', me: 0 })])
  })

  it('send() is a no-op when the socket is not open', () => {
    const client = new AnimatemClient('127.0.0.1', 51234, {})
    client.start()
    const socket = MockWebSocket.instances[0]
    socket.readyState = MockWebSocket.CLOSED

    client.send({ type: 'cut', me: 0 })
    expect(socket.sent).toEqual([])
  })

  it('reconnects automatically after the socket closes', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const client = new AnimatemClient('127.0.0.1', 51234, { onClose })
    client.start()
    MockWebSocket.instances[0].emit('close')

    expect(onClose).toHaveBeenCalledOnce()
    expect(MockWebSocket.instances).toHaveLength(1) // reconnect not yet due

    vi.advanceTimersByTime(3000)
    expect(MockWebSocket.instances).toHaveLength(2) // a new socket was created
  })

  it('does not reconnect after stop() is called', () => {
    vi.useFakeTimers()
    const client = new AnimatemClient('127.0.0.1', 51234, {})
    client.start()
    client.stop()

    vi.advanceTimersByTime(10_000)
    expect(MockWebSocket.instances).toHaveLength(1) // only the original socket, no reconnect
  })
})

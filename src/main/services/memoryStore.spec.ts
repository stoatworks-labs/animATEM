import { rmSync } from 'fs'
import { join } from 'path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Memory } from '../../shared/protocol'

const tempDir = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mkdtempSync } = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tmpdir } = require('os')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path')
  return mkdtempSync(join(tmpdir(), 'animatem-memory-test-'))
})

vi.mock('electron', () => ({
  app: { getPath: () => tempDir }
}))

const { deleteMemory, listMemories, saveMemory } = await import('./memoryStore')

function superSourceMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'mem-1',
    kind: 'supersource',
    name: 'Wide shot',
    superSourceIndex: 0,
    layout: { boxes: [] },
    ...overrides
  } as Memory
}

beforeEach(async () => {
  const { rm } = await import('fs/promises')
  await rm(join(tempDir, 'memories.json'), { force: true })
})

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('memoryStore', () => {
  it('starts empty', async () => {
    expect(await listMemories()).toEqual([])
  })

  it('saves and lists a memory', async () => {
    await saveMemory(superSourceMemory())
    expect(await listMemories()).toEqual([superSourceMemory()])
  })

  it('overwrites a memory with the same id rather than duplicating it', async () => {
    await saveMemory(superSourceMemory({ name: 'Wide shot' }))
    await saveMemory(superSourceMemory({ name: 'Wide shot (renamed)' }))

    const memories = await listMemories()
    expect(memories).toHaveLength(1)
    expect(memories[0].name).toBe('Wide shot (renamed)')
  })

  it('keeps distinct ids as separate memories', async () => {
    await saveMemory(superSourceMemory({ id: 'mem-1' }))
    await saveMemory(superSourceMemory({ id: 'mem-2', name: 'Close-up' }))

    expect(await listMemories()).toHaveLength(2)
  })

  it('deletes a memory by id, leaving the others untouched', async () => {
    await saveMemory(superSourceMemory({ id: 'mem-1' }))
    await saveMemory(superSourceMemory({ id: 'mem-2', name: 'Close-up' }))

    await deleteMemory('mem-1')

    const memories = await listMemories()
    expect(memories).toHaveLength(1)
    expect(memories[0].id).toBe('mem-2')
  })

  it('deleting a non-existent id is a no-op, not an error', async () => {
    await saveMemory(superSourceMemory())
    await expect(deleteMemory('does-not-exist')).resolves.not.toThrow()
    expect(await listMemories()).toHaveLength(1)
  })
})

import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { Memory } from '../../shared/protocol'

function storePath(): string {
  return join(app.getPath('userData'), 'memories.json')
}

export async function listMemories(): Promise<Memory[]> {
  try {
    const raw = await readFile(storePath(), 'utf-8')
    return JSON.parse(raw) as Memory[]
  } catch {
    return []
  }
}

async function writeAll(memories: Memory[]): Promise<void> {
  const path = storePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(memories, null, 2), 'utf-8')
}

export async function saveMemory(memory: Memory): Promise<void> {
  const memories = await listMemories()
  const next = memories.filter((m) => m.id !== memory.id)
  next.push(memory)
  await writeAll(next)
}

export async function deleteMemory(id: string): Promise<void> {
  const memories = await listMemories()
  await writeAll(memories.filter((m) => m.id !== id))
}

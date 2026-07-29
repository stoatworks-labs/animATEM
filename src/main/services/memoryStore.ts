import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { Memory } from '../../shared/protocol'

/**
 * Named SuperSource/DVE layout presets, as a JSON file in the app's userData
 * directory.
 *
 * These are animATEM's OWN memories, entirely independent of the ATEM's macro
 * system — they don't appear on the switcher and don't travel with it. Moving
 * to another machine means copying the file.
 *
 * The whole file is rewritten on every save or delete, with no locking. Fine
 * while the main process is the only writer; it would need revisiting before
 * anything else could touch it.
 */

function storePath(): string {
  return join(app.getPath('userData'), 'memories.json')
}

/**
 * Read every memory. An unreadable, missing or malformed file yields an EMPTY
 * LIST rather than an error — so a corrupted store presents to the operator as
 * "all my memories are gone", not as a failure. Deliberate (a bad file
 * shouldn't break the app on launch), but it means nothing upstream can tell
 * "no memories saved" from "the file is damaged".
 */
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

/**
 * Upsert by id: any existing entry with the same id is dropped and the new one
 * appended, so re-saving moves a memory to the END of the list. Anything
 * relying on list order should sort rather than assume.
 */
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

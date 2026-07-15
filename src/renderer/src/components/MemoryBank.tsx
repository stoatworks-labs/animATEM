import { useEffect, useState } from 'react'
import type { Memory } from '../../../shared/protocol'

interface Props {
  filter: (m: Memory) => boolean
  onRecall: (m: Memory) => void
  buildMemory: (name: string) => Memory
}

/**
 * Named app-level presets, independent of the ATEM's own macro system —
 * recalling loads a memory into the editor's *preview* state only, never
 * straight to air, so it can be reviewed (and re-adjusted) before Take.
 */
function MemoryBank({ filter, onRecall, buildMemory }: Props): React.JSX.Element {
  const [memories, setMemories] = useState<Memory[]>([])
  const [name, setName] = useState('')

  const reload = (): void => {
    window.api.memory.list().then((all) => setMemories(all.filter(filter)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return
    await window.api.memory.save(buildMemory(trimmed))
    setName('')
    reload()
  }

  const remove = async (id: string): Promise<void> => {
    await window.api.memory.delete(id)
    reload()
  }

  return (
    <div className="memory-bank">
      <div className="memory-bank-save">
        <input
          type="text"
          placeholder="Memory name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={() => void save()} disabled={!name.trim()}>
          Save current as memory
        </button>
      </div>
      <ul className="memory-list">
        {memories.map((m) => (
          <li key={m.id}>
            <span>{m.name}</span>
            <button onClick={() => onRecall(m)}>Recall</button>
            <button onClick={() => void remove(m.id)}>Delete</button>
          </li>
        ))}
        {memories.length === 0 && <li className="memory-empty">No memories saved yet.</li>}
      </ul>
    </div>
  )
}

export default MemoryBank

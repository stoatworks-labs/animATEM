import type ModuleInstance from './main.js'

export type ActionsSchema = {
  cut: { options: { me: number } }
  auto: { options: { me: number } }
  ftb: { options: { me: number } }
  set_program: { options: { input: number; me: number } }
  set_preview: { options: { input: number; me: number } }
  set_aux: { options: { source: number; bus: number } }
  recall_memory: { options: { memoryId: string } }
  animate_supersource: { options: { memoryId: string; durationMs: number } }
}

export function UpdateActions(self: ModuleInstance): void {
  const meOption = {
    id: 'me',
    type: 'number',
    label: 'M/E',
    default: 0,
    min: 0,
    max: 8
  } as const

  self.setActionDefinitions({
    cut: {
      name: 'Cut',
      options: [meOption],
      callback: async (event) => {
        self.client?.send({ type: 'cut', me: event.options.me })
      }
    },
    auto: {
      name: 'Auto transition',
      options: [meOption],
      callback: async (event) => {
        self.client?.send({ type: 'auto', me: event.options.me })
      }
    },
    ftb: {
      name: 'Fade to black',
      options: [meOption],
      callback: async (event) => {
        self.client?.send({ type: 'ftb', me: event.options.me })
      }
    },
    set_program: {
      name: 'Set program input',
      options: [
        { id: 'input', type: 'number', label: 'Input', default: 1, min: 0, max: 40 },
        meOption
      ],
      callback: async (event) => {
        self.client?.send({ type: 'setProgram', input: event.options.input, me: event.options.me })
      }
    },
    set_preview: {
      name: 'Set preview input',
      options: [
        { id: 'input', type: 'number', label: 'Input', default: 1, min: 0, max: 40 },
        meOption
      ],
      callback: async (event) => {
        self.client?.send({ type: 'setPreview', input: event.options.input, me: event.options.me })
      }
    },
    set_aux: {
      name: 'Set aux source',
      options: [
        { id: 'source', type: 'number', label: 'Source', default: 1, min: 0, max: 40 },
        { id: 'bus', type: 'number', label: 'Aux bus', default: 0, min: 0, max: 8 }
      ],
      callback: async (event) => {
        self.client?.send({ type: 'setAux', source: event.options.source, bus: event.options.bus })
      }
    },
    recall_memory: {
      name: 'Recall memory',
      options: [
        {
          id: 'memoryId',
          type: 'dropdown',
          label: 'Memory',
          default: self.memories[0]?.id ?? '',
          choices: self.memories.map((m) => ({
            id: m.id,
            label: `${m.name} (${m.kind === 'supersource' ? 'SSrc' : 'DVE'})`
          }))
        }
      ],
      callback: async (event) => {
        if (!event.options.memoryId) return
        self.client?.send({ type: 'recallMemory', id: event.options.memoryId })
      }
    },
    animate_supersource: {
      name: 'Animate to SuperSource memory',
      options: [
        {
          id: 'memoryId',
          type: 'dropdown',
          label: 'Memory',
          default: self.memories.find((m) => m.kind === 'supersource')?.id ?? '',
          choices: self.memories
            .filter((m) => m.kind === 'supersource')
            .map((m) => ({ id: m.id, label: m.name }))
        },
        {
          id: 'durationMs',
          type: 'number',
          label: 'Duration (ms)',
          default: 1000,
          min: 50,
          max: 30000
        }
      ],
      callback: async (event) => {
        if (!event.options.memoryId) return
        self.client?.send({
          type: 'animateSuperSource',
          id: event.options.memoryId,
          durationMs: event.options.durationMs
        })
      }
    }
  })
}

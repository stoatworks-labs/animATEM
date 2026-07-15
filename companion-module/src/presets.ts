import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function UpdatePresets(self: ModuleInstance): void {
  const structure: CompanionPresetSection[] = [
    {
      id: 'switching',
      name: 'Switching',
      definitions: [
        {
          id: 'transitions',
          name: 'Transitions',
          description: 'Cut, Auto, FTB on M/E 1',
          type: 'simple',
          presets: ['cut', 'auto', 'ftb']
        }
      ]
    }
  ]

  const presets: CompanionPresetDefinitions<ModuleSchema> = {}

  presets['cut'] = {
    type: 'simple',
    name: 'Cut',
    style: { text: 'Cut', size: 'auto', color: 0xffffff, bgcolor: 0xcc0000, show_topbar: false },
    steps: [{ down: [{ actionId: 'cut', options: { me: 0 } }], up: [] }],
    feedbacks: []
  }

  presets['auto'] = {
    type: 'simple',
    name: 'Auto',
    style: { text: 'Auto', size: 'auto', color: 0xffffff, bgcolor: 0x008000, show_topbar: false },
    steps: [{ down: [{ actionId: 'auto', options: { me: 0 } }], up: [] }],
    feedbacks: []
  }

  presets['ftb'] = {
    type: 'simple',
    name: 'FTB',
    style: { text: 'FTB', size: 'auto', color: 0xffffff, bgcolor: 0x000000, show_topbar: false },
    steps: [{ down: [{ actionId: 'ftb', options: { me: 0 } }], up: [] }],
    feedbacks: []
  }

  self.setPresetDefinitions(structure, presets)
}

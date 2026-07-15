import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
  atem_connected: { type: 'boolean'; options: Record<string, never> }
  program_input: { type: 'boolean'; options: { input: number } }
  preview_input: { type: 'boolean'; options: { input: number } }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
  self.setFeedbackDefinitions({
    atem_connected: {
      name: "animATEM's ATEM connection is up",
      type: 'boolean',
      defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
      options: [],
      callback: () => self.atemStatus === 'connected'
    },
    program_input: {
      name: 'Program input is X',
      type: 'boolean',
      defaultStyle: { bgcolor: 0xcc0000, color: 0xffffff },
      options: [{ id: 'input', type: 'number', label: 'Input', default: 1, min: 0, max: 40 }],
      callback: (feedback) => {
        const me0 = self.snapshot?.mixEffects.find((me) => me.index === 0)
        return me0?.programInput === feedback.options.input
      }
    },
    preview_input: {
      name: 'Preview input is X',
      type: 'boolean',
      defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
      options: [{ id: 'input', type: 'number', label: 'Input', default: 1, min: 0, max: 40 }],
      callback: (feedback) => {
        const me0 = self.snapshot?.mixEffects.find((me) => me.index === 0)
        return me0?.previewInput === feedback.options.input
      }
    }
  })
}

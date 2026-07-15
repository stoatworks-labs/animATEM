import type ModuleInstance from './main.js'

export type VariablesSchema = {
  atem_connection_status: string
  program_input: string
  preview_input: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
  self.setVariableDefinitions({
    atem_connection_status: { name: "animATEM's connection status to the ATEM switcher" },
    program_input: { name: 'Program input name (M/E 1)' },
    preview_input: { name: 'Preview input name (M/E 1)' }
  })
}

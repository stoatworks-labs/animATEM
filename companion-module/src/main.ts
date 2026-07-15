import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { AnimatemClient } from './wsClient.js'
import type { AtemSnapshot, ConnectionStatus, Memory } from './protocol.js'

export type ModuleSchema = {
  config: ModuleConfig
  secrets: undefined
  actions: ActionsSchema
  feedbacks: FeedbacksSchema
  variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
  config!: ModuleConfig
  client: AnimatemClient | null = null

  atemStatus: ConnectionStatus = 'disconnected'
  snapshot: AtemSnapshot | null = null
  memories: Memory[] = []

  constructor(internal: unknown) {
    super(internal)
  }

  async init(config: ModuleConfig): Promise<void> {
    this.config = config

    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()
    this.updateVariableDefinitions()

    this.connectClient()
  }

  async destroy(): Promise<void> {
    this.client?.stop()
    this.client = null
  }

  async configUpdated(config: ModuleConfig): Promise<void> {
    this.config = config
    this.client?.stop()
    this.connectClient()
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return GetConfigFields()
  }

  updateActions(): void {
    UpdateActions(this)
  }

  updateFeedbacks(): void {
    UpdateFeedbacks(this)
  }

  updatePresets(): void {
    UpdatePresets(this)
  }

  updateVariableDefinitions(): void {
    UpdateVariableDefinitions(this)
  }

  private connectClient(): void {
    this.updateStatus(InstanceStatus.Connecting)

    this.client = new AnimatemClient(this.config.host, this.config.port, {
      onOpen: () => {
        this.updateStatus(InstanceStatus.Ok)
      },
      onClose: () => {
        this.updateStatus(InstanceStatus.ConnectionFailure, 'Disconnected from animATEM')
      },
      onStatus: (status) => {
        this.atemStatus = status
        this.setVariableValues({ atem_connection_status: status })
        this.checkFeedbacks('atem_connected')
      },
      onSnapshot: (snapshot) => {
        this.snapshot = snapshot
        const me0 = snapshot?.mixEffects.find((me) => me.index === 0)
        const inputName = (id: number | undefined): string =>
          snapshot?.inputs.find((i) => i.id === id)?.shortName ??
          (id !== undefined ? String(id) : '')
        this.setVariableValues({
          program_input: inputName(me0?.programInput),
          preview_input: inputName(me0?.previewInput)
        })
        this.checkFeedbacks('program_input', 'preview_input')
      },
      onMemories: (memories) => {
        this.memories = memories
        this.updateActions() // memory dropdown choices depend on the current list
      }
    })
    this.client.start()
  }
}

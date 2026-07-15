import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
  host: string
  port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'textinput',
      id: 'host',
      label: 'animATEM host',
      width: 8,
      default: '127.0.0.1',
      regex: Regex.HOSTNAME
    },
    {
      type: 'number',
      id: 'port',
      label: 'animATEM control port',
      width: 4,
      min: 1,
      max: 65535,
      default: 51234
    }
  ]
}

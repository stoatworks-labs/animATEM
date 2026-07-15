import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { CalibrationProfile } from '../../shared/protocol'

function storePath(): string {
  return join(app.getPath('userData'), 'calibration.json')
}

async function readAll(): Promise<CalibrationProfile[]> {
  try {
    const raw = await readFile(storePath(), 'utf-8')
    return JSON.parse(raw) as CalibrationProfile[]
  } catch {
    return []
  }
}

async function writeAll(profiles: CalibrationProfile[]): Promise<void> {
  const path = storePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(profiles, null, 2), 'utf-8')
}

export async function getCalibrationProfile(
  resolutionKey: string
): Promise<CalibrationProfile | null> {
  const profiles = await readAll()
  return profiles.find((p) => p.resolutionKey === resolutionKey) ?? null
}

export async function saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
  const profiles = await readAll()
  const next = profiles.filter((p) => p.resolutionKey !== profile.resolutionKey)
  next.push(profile)
  await writeAll(next)
}

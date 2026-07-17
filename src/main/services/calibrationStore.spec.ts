import { rmSync } from 'fs'
import { join } from 'path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalibrationProfile } from '../../shared/protocol'

const tempDir = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mkdtempSync } = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tmpdir } = require('os')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path')
  return mkdtempSync(join(tmpdir(), 'animatem-calibration-test-'))
})

vi.mock('electron', () => ({
  app: { getPath: () => tempDir }
}))

const { getCalibrationProfile, saveCalibrationProfile } = await import('./calibrationStore')

function profile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return {
    resolutionKey: '1920x1080',
    multiViewerIndex: 0,
    boxes: [{ windowIndex: 0, rect: { x: 0, y: 0, width: 0.5, height: 0.5 } }],
    ...overrides
  }
}

beforeEach(async () => {
  // start each test from a clean store by overwriting with an empty save,
  // then deleting the file so getCalibrationProfile has nothing to find
  const { rm } = await import('fs/promises')
  await rm(join(tempDir, 'calibration.json'), { force: true })
})

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('calibrationStore', () => {
  it('returns null for a resolution that has never been saved', async () => {
    expect(await getCalibrationProfile('1280x720')).toBeNull()
  })

  it('saves and retrieves a profile by resolutionKey', async () => {
    await saveCalibrationProfile(profile())
    expect(await getCalibrationProfile('1920x1080')).toEqual(profile())
  })

  it('keeps profiles for different resolutions independent', async () => {
    await saveCalibrationProfile(profile({ resolutionKey: '1920x1080' }))
    await saveCalibrationProfile(profile({ resolutionKey: '1280x720', multiViewerIndex: 1 }))

    expect(await getCalibrationProfile('1920x1080')).toMatchObject({ multiViewerIndex: 0 })
    expect(await getCalibrationProfile('1280x720')).toMatchObject({ multiViewerIndex: 1 })
  })

  it('overwrites an existing profile for the same resolutionKey rather than duplicating it', async () => {
    await saveCalibrationProfile(profile({ multiViewerIndex: 0 }))
    await saveCalibrationProfile(profile({ multiViewerIndex: 2 }))

    const result = await getCalibrationProfile('1920x1080')
    expect(result?.multiViewerIndex).toBe(2)
  })
})

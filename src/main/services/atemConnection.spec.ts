import { describe, expect, it } from 'vitest'
import { Enums } from 'atem-connection'
import type { AtemState } from 'atem-connection'
import { buildSnapshot } from './atemConnection'

/**
 * Only populates the fields buildSnapshot actually reads. AtemState has a
 * lot of required fields (media, macro, ...) unrelated to this
 * transformation — cast rather than construct a fully valid fixture, since
 * this is testing buildSnapshot's own logic, not atem-connection's types.
 */
function fakeState(overrides: Record<string, unknown> = {}): AtemState {
  return {
    info: { model: Enums.Model.MiniExtremeISO },
    inputs: {
      1: { inputId: 1, shortName: 'CAM1', longName: 'Camera 1' },
      2: { inputId: 2, shortName: 'CAM2', longName: 'Camera 2' }
    },
    video: {
      mixEffects: [
        {
          index: 0,
          programInput: 1,
          previewInput: 2,
          transitionPosition: { inTransition: false },
          upstreamKeyers: []
        }
      ],
      superSources: [],
      auxilliaries: [1]
    },
    settings: { multiViewers: [] },
    ...overrides
  } as unknown as AtemState
}

describe('buildSnapshot', () => {
  it('returns null when there is no state (not yet connected)', () => {
    expect(buildSnapshot(undefined)).toBeNull()
  })

  it('maps inputs, dropping any undefined slots in the sparse inputs record', () => {
    const state = fakeState({
      inputs: { 1: { inputId: 1, shortName: 'CAM1', longName: 'Camera 1' }, 2: undefined }
    })
    const snapshot = buildSnapshot(state)
    expect(snapshot?.inputs).toEqual([{ id: 1, shortName: 'CAM1', longName: 'Camera 1' }])
  })

  it('maps mixEffects, reading inTransition from transitionPosition', () => {
    const snapshot = buildSnapshot(fakeState())
    expect(snapshot?.mixEffects).toEqual([
      { index: 0, programInput: 1, previewInput: 2, inTransition: false }
    ])
  })

  it('resolves the product model name from the numeric Model enum', () => {
    const snapshot = buildSnapshot(fakeState())
    expect(snapshot?.productModel).toBe('MiniExtremeISO')
  })

  it('falls back to "unknown" for a model value with no matching enum name', () => {
    const snapshot = buildSnapshot(fakeState({ info: { model: 9999 } }))
    expect(snapshot?.productModel).toBe('unknown')
  })

  it('attaches each box its own index and drops empty box slots', () => {
    const box = {
      enabled: true,
      source: 1,
      x: 0,
      y: 0,
      size: 1000,
      cropped: false,
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0
    }
    const state = fakeState({
      video: {
        mixEffects: [],
        auxilliaries: [],
        superSources: [{ index: 0, boxes: [box, undefined, undefined, undefined] }]
      }
    })
    const snapshot = buildSnapshot(state)
    expect(snapshot?.superSources).toEqual([{ index: 0, boxes: [{ index: 0, ...box }] }])
  })

  it('flattens DVE settings across every M/E and keyer, skipping keyers with no dveSettings', () => {
    const dveSettings = {
      positionX: 100,
      positionY: -100,
      sizeX: 2000,
      sizeY: 2000,
      maskEnabled: false,
      maskTop: 0,
      maskBottom: 0,
      maskLeft: 0,
      maskRight: 0
    }
    const state = fakeState({
      video: {
        auxilliaries: [],
        superSources: [],
        mixEffects: [
          {
            index: 0,
            programInput: 1,
            previewInput: 2,
            transitionPosition: { inTransition: false },
            upstreamKeyers: [
              {
                upstreamKeyerId: 0,
                onAir: true,
                fillSource: 1,
                cutSource: 0,
                dveSettings
              },
              {
                upstreamKeyerId: 1,
                onAir: false,
                fillSource: 2,
                cutSource: 0
                // no dveSettings -> should be skipped, not a chroma/luma/pattern keyer
              }
            ]
          }
        ]
      }
    })
    const snapshot = buildSnapshot(state)
    expect(snapshot?.upstreamKeyerDves).toEqual([
      { meIndex: 0, keyerIndex: 0, onAir: true, fillSource: 1, cutSource: 0, ...dveSettings }
    ])
  })

  it('builds the aux map from the auxilliaries array, skipping unassigned buses', () => {
    const state = fakeState({
      video: {
        mixEffects: [],
        superSources: [],
        auxilliaries: [5, undefined, 7]
      }
    })
    const snapshot = buildSnapshot(state)
    expect(snapshot?.auxes).toEqual({ 0: 5, 2: 7 })
  })

  it('maps multiViewer windows, the live window->source assignment calibration relies on', () => {
    const state = fakeState({
      settings: {
        multiViewers: [
          {
            index: 0,
            windows: [
              { windowIndex: 0, source: 1 },
              { windowIndex: 1, source: 2 }
            ]
          }
        ]
      }
    })
    const snapshot = buildSnapshot(state)
    expect(snapshot?.multiViewers).toEqual([
      {
        index: 0,
        windows: [
          { windowIndex: 0, source: 1 },
          { windowIndex: 1, source: 2 }
        ]
      }
    ])
  })
})

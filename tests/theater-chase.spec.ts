import { describe, expect, it } from 'vitest'
import { chaseLayout } from '../src/circuits/theater-chase/board'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import type { PerfLayout } from '../src/types/circuit'

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})

describe('theater chase board', () => {
  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(chaseLayout)).toEqual([])
  })

  it('never shorts two nets while it is being built', () => {
    [...new Set(chaseLayout.parts.map(p => p.s))].forEach(s => {
      expect(verifyPerfboard(upTo(chaseLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([])
    })
  })

  it('fits a 5x7 cm dot board', () => {
    expect(chaseLayout.cols * 2.54).toBeLessThanOrEqual(70)
    expect(chaseLayout.rows * 2.54).toBeLessThanOrEqual(50)
  })
})

import { chaseSim, defaults, litPieces, stepSeconds, POWER_OFF, type ChaseParams, type ChaseState } from '../src/circuits/theater-chase/simulate'
import { speedStyles } from '../src/circuits/theater-chase/styles'

const STEP = 0.001

function litHistory(p: ChaseParams, seconds: number): boolean[][] {
  const s: ChaseState = chaseSim.init(p)
  const frames: boolean[][] = []
  for (let t = 0; t < seconds; t += STEP) {
    chaseSim.step(s, p, STEP)
    frames.push(s.on ? litPieces(s.count) : [false, false, false, false])
  }
  return frames
}

const changes = (frames: boolean[][]) => frames.filter((f, i) => i && f.join() !== frames[i - 1].join())

describe('theater chase simulator', () => {
  it('steps about every 80 ms with 100k and 1 uF', () => {
    expect(stepSeconds(defaults)).toBeCloseTo(0.081, 3)
  })

  it('lights pieces 1 and 4, then 2, then 3, then repeats', () => {
    const order = changes(litHistory(defaults, 0.5)).map(f => f.map(on => (on ? 1 : 0)).join(''))
    expect(order.slice(0, 4)).toEqual(['0100', '0010', '1001', '0100'])
  })

  it('always lights exactly one phase', () => {
    litHistory(defaults, 1).forEach(f => {
      const count = f.filter(Boolean).length
      expect([1, 2]).toContain(count)
    })
  })

  it('moves slower with a bigger R1', () => {
    expect(changes(litHistory({ ...defaults, R: 390e3 }, 2)).length).toBeLessThan(changes(litHistory(defaults, 2)).length)
  })

  it('stays dark with the power off', () => {
    expect(litHistory({ ...defaults, power: POWER_OFF }, 0.5).every(f => f.every(on => !on))).toBe(true)
  })

  it('keeps every piece current within the strip rating at 12 V', () => {
    const s = chaseSim.init(defaults)
    chaseSim.step(s, defaults, STEP)
    expect(s.I).toBeLessThan(0.05)
  })
})

describe('theater chase speed presets', () => {
  it('marks the kit values as the theater speed', () => {
    expect(speedStyles.filter(s => s.isActive(defaults)).map(s => s.id)).toEqual(['theater'])
  })

  it('makes each speed active once applied', () => {
    speedStyles.forEach(s => {
      const p = s.apply(defaults)
      expect(speedStyles.filter(o => o.isActive(p)).map(o => o.id), s.id).toEqual([s.id])
    })
  })
})

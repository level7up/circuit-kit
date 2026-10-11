import { describe, expect, it } from 'vitest'
import { BUS_ROW, MATRIX_DIODES, SCHEMATIC, patternLayout } from '../src/circuits/headlight-patterns/board'
import { BETWEEN, BUS_STEPS, PATTERNS, STEPS, SYNC, outputs, type BusId, type Outputs } from '../src/circuits/headlight-patterns/patterns'
import {
  FAULT_CLOCK_STUCK, FAULT_LOGIC_LOST, FAULT_SHORT, GATE_THRESHOLD, LOGIC_MIN, OFF, defaults, logicVolts, patternSim, stepSeconds,
  type PatternParams, type PatternState
} from '../src/circuits/headlight-patterns/simulate'
import { steps } from '../src/circuits/headlight-patterns/steps'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import type { PerfLayout } from '../src/types/circuit'

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})

describe('headlight pattern logic', () => {
  it('gives every selector position its own sequence', () => {
    const rows = PATTERNS.map(p => JSON.stringify(Array.from({ length: STEPS }, (_, n) => outputs(p.id, n))))
    expect(new Set(rows).size).toBe(PATTERNS.length)
  })

  it('never lights both sides in the alternating and double-flash patterns', () => {
    [PATTERNS[0], PATTERNS[2]].forEach(p => {
      for (let n = 0; n < STEPS; n++) {
        const o = outputs(p.id, n)
        expect(o.left && o.right, p.name + ' step ' + n).toBe(false)
      }
    })
  })

  it('keeps a dark step between the two sides when alternating', () => {
    expect(outputs(0, 4)).toEqual({ left: false, right: false })
    expect(outputs(0, 9)).toEqual({ left: false, right: false })
  })

  it('flashes each side twice in the double-flash pattern', () => {
    const left = Array.from({ length: STEPS }, (_, n) => outputs(2, n).left)
    const right = Array.from({ length: STEPS }, (_, n) => outputs(2, n).right)
    expect(left.filter(Boolean)).toHaveLength(2)
    expect(right.filter(Boolean)).toHaveLength(2)
    expect(left.slice(0, 4)).toEqual([true, false, true, false])
  })

  it('turns everything off between selector positions', () => {
    for (let n = 0; n < STEPS; n++) expect(outputs(4, n)).toEqual({ left: false, right: false })
  })
})

describe('headlight pattern board', () => {
  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(patternLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const fixed = patternLayout.parts.filter(p => p.k !== 'pad' && p.k !== 'wire' && !p.id.match(/^D[A-E]\d$/))
    expect(Object.fromEntries(fixed.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('builds the diode matrix exactly from the state table', () => {
    const built = new Set(MATRIX_DIODES.map(d => d.q + '>' + d.bus))
    const wanted = new Set((Object.keys(BUS_STEPS) as BusId[]).flatMap(bus => BUS_STEPS[bus].map(n => n + '>' + bus)))
    expect(built).toEqual(wanted)
    MATRIX_DIODES.forEach(d => {
      const part = patternLayout.parts.find(p => p.id === d.id)!
      expect(part.nets).toEqual(['Q' + d.q, d.bus])
      expect(part.legs[1]).toEqual([d.x, BUS_ROW[d.bus]])
      expect(BUS_ROW[d.bus] - d.y, d.id).toBeGreaterThanOrEqual(3)
    })
  })

  it('never shorts two nets while it is being built', () => {
    const stages = [...new Set(patternLayout.parts.map(p => p.s))]
    stages.forEach(s => expect(verifyPerfboard(upTo(patternLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })
})

const STEP = 0.005

function run(p: PatternParams, seconds: number, s: PatternState = patternSim.init(p)): PatternState {
  for (let t = 0; t < seconds; t += STEP) patternSim.step(s, p, STEP)
  return s
}

function record(p: PatternParams, seconds: number): Outputs[] {
  const s = patternSim.init(p)
  const seen: Outputs[] = []
  for (let t = 0; t < seconds; t += STEP) {
    patternSim.step(s, p, STEP)
    seen.push({ left: s.left, right: s.right })
  }
  return seen
}

describe('headlight pattern simulator', () => {
  it('starts at step 0 on power-up', () => {
    const s = run(defaults, STEP)
    expect(s.step).toBe(0)
    expect(s.left).toBe(true)
  })

  it('steps every 81 ms with R1 100k and C4 1µF', () => {
    expect(stepSeconds(defaults)).toBeCloseTo(0.081, 3)
    expect(run(defaults, 0.081 * 3 + 0.01).step).toBe(3)
  })

  it('never lights both sides together while alternating', () => {
    expect(record(defaults, 3).some(o => o.left && o.right)).toBe(false)
  })

  it('lights both together in the sync pattern', () => {
    expect(record({ ...defaults, pattern: SYNC }, 3).every(o => o.left === o.right)).toBe(true)
  })

  it('turns everything off with the master switch, between positions, or without logic power', () => {
    [{ enable: OFF }, { pattern: BETWEEN }, { fault: FAULT_LOGIC_LOST }].forEach(change => {
      expect(record({ ...defaults, ...change }, 2).some(o => o.left || o.right)).toBe(false)
    })
  })

  it('blows only the left fuse on a shorted left lamp', () => {
    const s = run({ ...defaults, pattern: SYNC, fault: FAULT_SHORT }, 2)
    expect(s.fuseBlown).toBe(true)
    expect(record({ ...defaults, pattern: SYNC, fault: FAULT_SHORT }, 2).some(o => o.right)).toBe(true)
  })

  it('holds one step when the clock stops', () => {
    const seen = record({ ...defaults, fault: FAULT_CLOCK_STUCK }, 2)
    expect(seen.every(o => o.left && !o.right)).toBe(true)
  })

  it('keeps the logic running at cranking voltage', () => {
    const s = run({ ...defaults, vbat: 9.6 }, 0.5)
    expect(logicVolts(9.6)).toBeGreaterThan(LOGIC_MIN)
    expect(s.gl + s.gr).toBeGreaterThan(GATE_THRESHOLD)
  })
})

describe('headlight pattern steps', () => {
  it('keeps every scene spot inside the drawing', () => {
    steps.flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })
})

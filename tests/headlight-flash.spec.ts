import { describe, expect, it } from 'vitest'
import { FLASH_DIODES, LINE_ROW, SCHEMATIC, flashLayout } from '../src/circuits/headlight-flash/board'
import { LEFT_STEPS, RIGHT_STEPS, STEPS, outputs, type Outputs } from '../src/circuits/headlight-flash/patterns'
import {
  FAULT_CLOCK_STUCK, FAULT_LOGIC_LOST, FAULT_SHORT, GATE_THRESHOLD, LOGIC_MIN, OFF, defaults, flashSim, logicVolts, stepSeconds,
  type FlashParams, type FlashState
} from '../src/circuits/headlight-flash/simulate'
import { steps } from '../src/circuits/headlight-flash/steps'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'
import type { PerfLayout } from '../src/types/circuit'

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})

describe('double flash logic', () => {
  it('flashes the left side twice then the right side twice', () => {
    const seq = Array.from({ length: STEPS }, (_, n) => outputs(n))
    expect(seq.map(o => o.left)).toEqual([true, false, true, false, false, false, false, false, false, false])
    expect(seq.map(o => o.right)).toEqual([false, false, false, false, false, true, false, true, false, false])
  })

  it('never lights both sides together', () => {
    for (let n = 0; n < STEPS; n++) expect(outputs(n).left && outputs(n).right).toBe(false)
  })
})

describe('double flash board', () => {
  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(flashLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const fixed = flashLayout.parts.filter(p => p.k !== 'pad' && p.k !== 'wire')
    expect(Object.fromEntries(fixed.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('puts each diode on the step it should flash', () => {
    const left = FLASH_DIODES.filter(d => d.line === 'SL').map(d => d.q).sort()
    const right = FLASH_DIODES.filter(d => d.line === 'SR').map(d => d.q).sort()
    expect(left).toEqual(LEFT_STEPS)
    expect(right).toEqual(RIGHT_STEPS)
    FLASH_DIODES.forEach(d => {
      const part = flashLayout.parts.find(p => p.id === d.id)!
      expect(part.legs[1]).toEqual([d.x, LINE_ROW[d.line]])
    })
  })

  it('never shorts two nets while it is being built', () => {
    const stages = [...new Set(flashLayout.parts.map(p => p.s))]
    stages.forEach(s => expect(verifyPerfboard(upTo(flashLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })
})

const STEP = 0.005

function run(p: FlashParams, seconds: number): FlashState {
  const s = flashSim.init(p)
  for (let t = 0; t < seconds; t += STEP) flashSim.step(s, p, STEP)
  return s
}

function record(p: FlashParams, seconds: number): Outputs[] {
  const s = flashSim.init(p)
  const seen: Outputs[] = []
  for (let t = 0; t < seconds; t += STEP) {
    flashSim.step(s, p, STEP)
    seen.push({ left: s.left, right: s.right })
  }
  return seen
}

describe('double flash simulator', () => {
  it('starts at step 0 with the left side lit', () => {
    const s = run(defaults, STEP)
    expect(s.step).toBe(0)
    expect(s.left).toBe(true)
  })

  it('steps every 81 ms with R1 100k and C4 1µF', () => {
    expect(stepSeconds(defaults)).toBeCloseTo(0.081, 3)
    expect(run(defaults, 0.081 * 3 + 0.01).step).toBe(3)
  })

  it('never lights both sides together', () => {
    expect(record(defaults, 3).some(o => o.left && o.right)).toBe(false)
  })

  it('turns everything off with the switch or without logic power', () => {
    [{ enable: OFF }, { fault: FAULT_LOGIC_LOST }].forEach(change => {
      expect(record({ ...defaults, ...change }, 2).some(o => o.left || o.right)).toBe(false)
    })
  })

  it('blows only the left fuse on a shorted left lamp', () => {
    expect(run({ ...defaults, fault: FAULT_SHORT }, 2).fuseBlown).toBe(true)
    expect(record({ ...defaults, fault: FAULT_SHORT }, 2).some(o => o.right)).toBe(true)
  })

  it('holds one step when the clock stops', () => {
    expect(record({ ...defaults, fault: FAULT_CLOCK_STUCK }, 2).every(o => o.left && !o.right)).toBe(true)
  })

  it('keeps the logic running at cranking voltage', () => {
    expect(logicVolts(9.6)).toBeGreaterThan(LOGIC_MIN)
    expect(logicVolts(9.6) - 0.7).toBeGreaterThan(GATE_THRESHOLD)
  })
})

describe('double flash steps', () => {
  it('keeps every scene spot inside the drawing', () => {
    steps.flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })
})

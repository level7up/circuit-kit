import { describe, expect, it } from 'vitest'
import { assembly } from '../src/circuits/usb-charger/assembly'
import { SCHEMATIC, chargerLayout } from '../src/circuits/usb-charger/board'
import {
  BUCK, CRANKING, ENGINE_RUN, KEY_ACC, KEY_OFF, LINEAR, chargerSim, defaults,
  type ChargerParams, type ChargerState
} from '../src/circuits/usb-charger/simulate'
import { stepVariants } from '../src/circuits/usb-charger/steps'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'
import type { PerfLayout } from '../src/types/circuit'

const STEP = 0.01

function run(p: ChargerParams, seconds: number): ChargerState {
  const s = chargerSim.init(p)
  for (let t = 0; t < seconds; t += STEP) chargerSim.step(s, p, STEP)
  return s
}

describe('usb charger simulator', () => {
  it('gives 5.1V to two phones with the engine running', () => {
    const s = run(defaults, 1)
    expect(s.vout).toBeCloseTo(5.1, 2)
    expect(s.iout).toBeCloseTo(2, 5)
    expect(s.vbat).toBeCloseTo(14.2, 2)
  })

  it('draws nothing with the key off', () => {
    const s = run({ ...defaults, car: KEY_OFF }, 1)
    expect(s.vout).toBe(0)
    expect(s.iin).toBe(0)
  })

  it('stays under the 3A fuse even at full load', () => {
    const s = run({ ...defaults, car: KEY_ACC, phoneAmps: 2.1 }, 1)
    expect(s.limited).toBe(true)
    expect(s.iin).toBeLessThan(3)
  })

  it('wastes far more heat in a 7805 than in the buck module', () => {
    const buck = run({ ...defaults, converter: BUCK }, 1)
    const linear = run({ ...defaults, converter: LINEAR }, 1)
    expect(buck.heat).toBeLessThan(2)
    expect(linear.heat).toBeGreaterThan(8)
  })

  it('keeps charging through the cranking dip', () => {
    const p = { ...defaults, car: CRANKING }
    const s = chargerSim.init(p)
    let lowest = Infinity
    for (let t = 0; t < 7; t += STEP) {
      chargerSim.step(s, p, STEP)
      lowest = Math.min(lowest, s.vout)
    }
    expect(lowest).toBeCloseTo(5.1, 2)
  })

  it('shows the battery voltage on the voltmeter before the diode', () => {
    const s = run({ ...defaults, car: ENGINE_RUN }, 1)
    expect(s.vbat - s.vin).toBeCloseTo(0.85, 2)
  })
})

describe('usb charger board', () => {
  const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
    ...layout,
    parts: layout.parts.filter(p => p.s <= s),
    traces: layout.traces.filter(t => t.s <= s)
  })

  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(chargerLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const wired = Object.fromEntries(chargerLayout.parts.filter(p => p.k !== 'pad').map(p => [p.id, p.nets]))
    expect(wired).toEqual(SCHEMATIC)
  })

  it('never shorts two nets while it is being built', () => {
    const stages = [...new Set(chargerLayout.parts.map(p => p.s))]
    stages.forEach(s => expect(verifyPerfboard(upTo(chargerLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })

  it('has a phase for every stage', () => {
    const stages = new Set(chargerLayout.parts.map(p => p.s))
    const phases = new Set(assembly.boards[0].phases.map(p => p.s))
    stages.forEach(s => expect(phases.has(s), 'stage ' + s).toBe(true))
  })
})

describe('usb charger steps', () => {
  it('keeps every scene spot inside the drawing', () => {
    stepVariants.flatMap(v => v.items).flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })
})

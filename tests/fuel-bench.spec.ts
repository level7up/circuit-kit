import { describe, expect, it } from 'vitest'
import { assembly } from '../src/circuits/fuel-bench/assembly'
import { ARDUINO_PINS, NANO_NETS, SCHEMATIC, benchLayout } from '../src/circuits/fuel-bench/board'
import { FAULT_LATCHED, FAULT_NONE, FAULT_OUTPUT, FAULT_OVER_PRESSURE, FAULT_SENSOR_OPEN, FAULT_UNDER_PRESSURE, FAULT_WATCHDOG, READY, RUNNING } from '../src/circuits/fuel-bench/controller'
import {
  INJECT_FIRMWARE_HANG, INJECT_LAMP_OPEN, INJECT_LEAK, INJECT_MOSFET_SHORT, INJECT_NONE, INJECT_RETURN_BLOCKED, INJECT_SENSOR_OPEN,
  OFF, ON, PRESS_LONG, PRESS_SHORT, defaults, fuelSim, type FuelParams, type FuelState
} from '../src/circuits/fuel-bench/simulate'
import { steps } from '../src/circuits/fuel-bench/steps'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'
import type { PerfLayout } from '../src/types/circuit'

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})

describe('fuel bench board', () => {
  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(benchLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const fixed = benchLayout.parts.filter(p => p.k !== 'pad' && p.k !== 'wire')
    expect(Object.fromEntries(fixed.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('puts each signal on the Nano pin the firmware reads', () => {
    const expected: Record<string, string> = { D2: 'BTN', D7: 'RUN', D8: 'FLT', D9: 'PWM', A0: 'SNS', A1: 'KNB', A2: 'ARM', A3: 'FB', A4: 'SDA', A5: 'SCL', '5V': 'V5', GND: 'GND', VIN: 'VP' }
    Object.entries(ARDUINO_PINS).forEach(([name, pinNo]) => expect(NANO_NETS[pinNo - 1], name).toBe(expected[name]))
  })

  it('never shorts two nets while it is being built', () => {
    const stages = [...new Set(benchLayout.parts.map(p => p.s))]
    stages.forEach(s => expect(verifyPerfboard(upTo(benchLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })

  it('has a phase for every stage', () => {
    const phases = new Set(assembly.boards[0].phases.map(p => p.s))
    new Set(benchLayout.parts.map(p => p.s)).forEach(s => expect(phases.has(s), 'stage ' + s).toBe(true))
  })
})

const STEP = 0.001

function run(p: FuelParams, seconds: number, s: FuelState = fuelSim.init(p)): FuelState {
  for (let t = 0; t < seconds; t += STEP) fuelSim.step(s, p, STEP)
  return s
}

const pressed = (p: FuelParams, kind: number): FuelParams => ({ ...p, press: kind, pressSeq: p.pressSeq + 1 })

function runningBench(change: Partial<FuelParams> = {}): { s: FuelState; p: FuelParams } {
  const s = run(defaults, 2)
  const p = pressed({ ...defaults, ...change }, PRESS_SHORT)
  return { s: run(p, 1, s), p }
}

describe('fuel bench simulator', () => {
  it('boots with the lamp off and waits in ready', () => {
    const s = run(defaults, 3)
    expect(s.ctl.state).toBe(READY)
    expect(s.lamp).toBe(0)
  })

  it('starts on a press and settles near the commanded pressure', () => {
    const { s, p } = runningBench()
    const later = run({ ...p, knob: 60 }, 3, s)
    expect(later.ctl.state).toBe(RUNNING)
    expect(later.lamp).toBeCloseTo(0.6, 2)
    expect(later.ctl.pressurePct).toBeGreaterThan(55)
    expect(later.ctl.pressurePct).toBeLessThan(65)
  })

  it('latches an open sensor and turns the lamp off', () => {
    const { s, p } = runningBench()
    const later = run({ ...p, inject: INJECT_SENSOR_OPEN }, 0.5, s)
    expect(later.ctl.fault).toBe(FAULT_SENSOR_OPEN)
    expect(later.lamp).toBe(0)
  })

  it('trips over-pressure when the return is blocked and the knob goes up', () => {
    const { s, p } = runningBench({ inject: INJECT_RETURN_BLOCKED })
    expect(run({ ...p, knob: 80 }, 3, s).ctl.fault).toBe(FAULT_OVER_PRESSURE)
  })

  it('trips under-pressure after priming when there is a leak', () => {
    const { s, p } = runningBench({ inject: INJECT_LEAK })
    expect(run(p, 3, s).ctl.fault).toBe(FAULT_UNDER_PRESSURE)
  })

  it('catches a missing lamp before it can start', () => {
    expect(run({ ...defaults, inject: INJECT_LAMP_OPEN }, 2).ctl.fault).toBe(FAULT_OUTPUT)
  })

  it('shows that only S1 can switch off a shorted MOSFET', () => {
    const shorted = run({ ...defaults, inject: INJECT_MOSFET_SHORT }, 2)
    expect(shorted.ctl.fault).toBe(FAULT_OUTPUT)
    expect(shorted.lamp).toBe(1)
    expect(run({ ...defaults, inject: INJECT_MOSFET_SHORT, arm: OFF }, 0.2, shorted).lamp).toBe(0)
  })

  it('resets through the watchdog when the firmware hangs while running', () => {
    const { s, p } = runningBench({ inject: INJECT_FIRMWARE_HANG })
    const later = run(p, 0.5, s)
    expect(later.ctl.state).toBe(FAULT_LATCHED)
    expect(later.ctl.fault).toBe(FAULT_WATCHDOG)
    expect(later.lamp).toBe(0)
  })

  it('keeps a latched fault across a power cycle', () => {
    const { s, p } = runningBench()
    const faulted = run({ ...p, inject: INJECT_SENSOR_OPEN }, 0.5, s)
    const off = run({ ...p, inject: INJECT_NONE, power: OFF }, 0.5, faulted)
    const back = run({ ...p, inject: INJECT_NONE, power: ON }, 1, off)
    expect(back.ctl.state).toBe(FAULT_LATCHED)
    expect(back.ctl.fault).toBe(FAULT_SENSOR_OPEN)
  })

  it('clears only on a long press once the cause is gone', () => {
    const { s, p } = runningBench()
    const faulted = run({ ...p, inject: INJECT_SENSOR_OPEN }, 0.5, s)
    const shortTry = pressed({ ...p, inject: INJECT_NONE }, PRESS_SHORT)
    expect(run(shortTry, 1, faulted).ctl.state).toBe(FAULT_LATCHED)
    const longTry = pressed(shortTry, PRESS_LONG)
    const cleared = run(longTry, 4, faulted)
    expect(cleared.ctl.state).toBe(READY)
    expect(cleared.eeprom).toBe(FAULT_NONE)
    expect(cleared.lamp).toBe(0)
  })
})

describe('fuel bench steps', () => {
  it('keeps every scene spot inside the drawing', () => {
    steps.flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  BENCH_PROFILE, FAULT_BAD_PROFILE, FAULT_LATCHED, FAULT_NONE, FAULT_OUTPUT, FAULT_OVER_PRESSURE, FAULT_SENSOR_OPEN,
  FAULT_SENSOR_SHORT, FAULT_UNDER_PRESSURE, FAULT_WATCHDOG, READY, RUNNING, SELF_TEST,
  begin, isProfileValid, lcdLines, outputsOf, step, type Controller, type Inputs
} from '../src/circuits/fuel-bench/controller'

const TICK_MS = 10
const P = BENCH_PROFILE
const MID_SENSOR = 512
const ARMED = 430
const DRAIN_HIGH = 430

const idle = (nowMs: number): Inputs => ({ nowMs, sensorRaw: MID_SENSOR, knobRaw: 0, armRaw: ARMED, drainRaw: DRAIN_HIGH, buttonDown: false })

interface Bench {
  c: Controller
  nowMs: number
}

function run(b: Bench, ms: number, change: Partial<Inputs> = {}): Bench {
  let c = b.c
  let nowMs = b.nowMs
  for (let t = 0; t < ms; t += TICK_MS) {
    nowMs += TICK_MS
    c = step(c, { ...idle(nowMs), ...change }, P)
  }
  return { c, nowMs }
}

const boot = (): Bench => run({ c: begin(FAULT_NONE, false, P, 0), nowMs: 0 }, P.selfTestMs + 50)
const press = (b: Bench, holdMs: number, change: Partial<Inputs> = {}): Bench => run(run(b, holdMs, { ...change, buttonDown: true }), TICK_MS * 2, change)
const started = (): Bench => press(boot(), 100)

describe('fuel bench controller: start-up', () => {
  it('boots with the output off and walks through self test into ready', () => {
    const first = step(begin(FAULT_NONE, false, P, 0), idle(10), P)
    expect(first.state).toBe(SELF_TEST)
    expect(outputsOf(first).dutyPct).toBe(0)
    expect(boot().c.state).toBe(READY)
    expect(outputsOf(boot().c).dutyPct).toBe(0)
  })

  it('never starts on its own after power-up', () => {
    const b = run(boot(), 10000)
    expect(b.c.state).toBe(READY)
    expect(outputsOf(b.c).dutyPct).toBe(0)
  })

  it('comes back latched when a fault was stored before the power cut', () => {
    const c = begin(FAULT_OVER_PRESSURE, false, P, 0)
    expect(c.state).toBe(FAULT_LATCHED)
    expect(c.fault).toBe(FAULT_OVER_PRESSURE)
  })

  it('latches a watchdog reset', () => {
    expect(begin(FAULT_NONE, true, P, 0).fault).toBe(FAULT_WATCHDOG)
  })

  it('refuses a profile whose limits do not make sense', () => {
    const bad = { ...P, pressureLowPct: 90 }
    expect(isProfileValid(P)).toBe(true)
    expect(isProfileValid(bad)).toBe(false)
    expect(begin(FAULT_NONE, false, bad, 0).fault).toBe(FAULT_BAD_PROFILE)
  })
})

describe('fuel bench controller: explicit enable', () => {
  it('starts on a short press with the knob at zero, at the minimum duty', () => {
    const b = started()
    expect(b.c.state).toBe(RUNNING)
    expect(outputsOf(b.c).dutyPct).toBe(P.minDutyPct)
  })

  it('will not start while the knob is turned up', () => {
    const b = press(boot(), 100, { knobRaw: 512 })
    expect(b.c.state).toBe(READY)
  })

  it('will not start with the hardware enable switch off', () => {
    const b = press(run(boot(), 200, { armRaw: 0, drainRaw: 0 }), 100, { armRaw: 0, drainRaw: 0 })
    expect(b.c.state).toBe(READY)
  })

  it('ignores a bounce shorter than the debounce time', () => {
    const b = press(boot(), TICK_MS)
    expect(b.c.state).toBe(READY)
  })

  it('follows the knob but never past the profile maximum', () => {
    expect(outputsOf(run(started(), 200, { knobRaw: 512 }).c).dutyPct).toBe(50)
    expect(outputsOf(run(started(), 200, { knobRaw: 1023 }).c).dutyPct).toBe(P.maxDutyPct)
  })

  it('stops on a second short press', () => {
    const b = press(started(), 100)
    expect(b.c.state).toBe(READY)
    expect(outputsOf(b.c).dutyPct).toBe(0)
  })

  it('stops when the enable switch is turned off', () => {
    const b = run(started(), 300, { armRaw: 0, drainRaw: 0 })
    expect(b.c.state).toBe(READY)
    expect(outputsOf(b.c).dutyPct).toBe(0)
  })
})

describe('fuel bench controller: faults', () => {
  const faultCases: [string, Partial<Inputs>, number][] = [
    ['open sensor wire', { sensorRaw: 0 }, FAULT_SENSOR_OPEN],
    ['sensor shorted to 5V', { sensorRaw: 1023 }, FAULT_SENSOR_SHORT],
    ['pressure above the limit', { sensorRaw: 950 }, FAULT_OVER_PRESSURE]
  ]

  it.each(faultCases)('latches %s while running and turns the output off', (_name, change, fault) => {
    const b = run(started(), 500, change)
    expect(b.c.state).toBe(FAULT_LATCHED)
    expect(b.c.fault).toBe(fault)
    expect(outputsOf(b.c).dutyPct).toBe(0)
    expect(outputsOf(b.c).faultLed).toBe(true)
  })

  it.each(faultCases)('latches %s while ready too', (_name, change, fault) => {
    expect(run(boot(), 500, change).c.fault).toBe(fault)
  })

  it('waits for the priming time before calling low pressure a fault', () => {
    const low = { sensorRaw: 150 }
    expect(run(started(), P.primeMs - 200, low).c.state).toBe(RUNNING)
    const b = run(started(), P.primeMs + 300, low)
    expect(b.c.fault).toBe(FAULT_UNDER_PRESSURE)
  })

  it('does not trip on a single noisy sample', () => {
    const b = run(run(started(), TICK_MS, { sensorRaw: 0 }), 300)
    expect(b.c.state).toBe(RUNNING)
  })

  it('catches a shorted MOSFET or missing lamp while the output is off', () => {
    const b = run(boot(), 300, { drainRaw: 0 })
    expect(b.c.fault).toBe(FAULT_OUTPUT)
  })

  it('fails the self test when the output stage is already stuck on', () => {
    const b = run({ c: begin(FAULT_NONE, false, P, 0), nowMs: 0 }, 500, { drainRaw: 0 })
    expect(b.c.fault).toBe(FAULT_OUTPUT)
  })

  it('stays latched when the cause goes away on its own', () => {
    const b = run(run(started(), 500, { sensorRaw: 0 }), 5000)
    expect(b.c.state).toBe(FAULT_LATCHED)
    expect(outputsOf(b.c).dutyPct).toBe(0)
  })

  it('ignores a short press while latched', () => {
    const b = press(run(started(), 500, { sensorRaw: 0 }), 100)
    expect(b.c.state).toBe(FAULT_LATCHED)
  })
})

describe('fuel bench controller: deliberate reset', () => {
  const latched = (): Bench => run(run(started(), 500, { sensorRaw: 0 }), 200)

  it('clears after a long press once the cause is gone, then self-tests again', () => {
    const b = run(latched(), 0)
    const held = run(b, P.resetHoldMs + 50, { buttonDown: true })
    expect(held.c.state).toBe(SELF_TEST)
    expect(held.c.fault).toBe(FAULT_NONE)
    expect(outputsOf(held.c).dutyPct).toBe(0)
  })

  it('does not start the output when the reset button is released', () => {
    const b = run(run(latched(), P.resetHoldMs + 50, { buttonDown: true }), P.selfTestMs + 200)
    expect(b.c.state).toBe(READY)
  })

  it('refuses the reset while the sensor is still open', () => {
    const b = run(latched(), P.resetHoldMs + 50, { sensorRaw: 0, buttonDown: true })
    expect(b.c.state).toBe(FAULT_LATCHED)
  })

  it('refuses the reset while the knob is turned up', () => {
    const b = run(latched(), P.resetHoldMs + 50, { knobRaw: 600, buttonDown: true })
    expect(b.c.state).toBe(FAULT_LATCHED)
  })

  it('never clears a bad profile', () => {
    const b = run({ c: begin(FAULT_NONE, false, { ...P, maxDutyPct: 120 }, 0), nowMs: 0 }, P.resetHoldMs + 500, { buttonDown: true })
    expect(b.c.fault).toBe(FAULT_BAD_PROFILE)
  })
})

describe('fuel bench controller: display', () => {
  it('shows state, pressure, request and output in 16 columns', () => {
    const [top, bottom] = lcdLines(run(started(), 300, { knobRaw: 512 }).c)
    expect(top).toBe('RUNNING    P 50%')
    expect(bottom).toBe('REQ 50% OUT 50% ')
  })

  it('shows the fault code when latched', () => {
    const [, bottom] = lcdLines(run(started(), 500, { sensorRaw: 0 }).c)
    expect(bottom).toBe('F1 SENSOR OPEN  ')
  })
})

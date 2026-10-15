import { describe, expect, it } from 'vitest'
import { circuits, findCircuit } from '../src/circuits'
import { bom } from '../src/circuits/auto-cover/bom'
import {
  CLOSED, CMD_CLOSE, CMD_OPEN, CMD_STOP, FULL_TURNS, LOW_BATTERY, OPEN, OPENING, PAUSED, SENSOR_LOST, STALLED,
  begin, step as controllerStep, type Inputs
} from '../src/circuits/auto-cover/controller'
import { livePreview } from '../src/circuits/auto-cover/content'
import {
  FAULT_HALL_DEAD, FAULT_HOME_DEAD, FAULT_JAM, coverSim, defaults, type CoverParams, type CoverState
} from '../src/circuits/auto-cover/simulate'
import { steps } from '../src/circuits/auto-cover/steps'
import type { BomItem } from '../src/types/circuit'
import FIRMWARE from '../firmware/auto_cover/auto_cover.ino?raw'

const STEP = 0.01

function run(p: CoverParams, seconds: number, from?: CoverState): CoverState {
  const s = from ?? coverSim.init(p)
  for (let t = 0; t < seconds; t += STEP) coverSim.step(s, p, STEP)
  return s
}

const opened = (p: Partial<CoverParams> = {}) => run({ ...defaults, ...p, target: CMD_OPEN }, 20)

describe('auto cover controller', () => {
  const idle: Inputs = { nowMs: 0, cmd: CMD_OPEN, pulses: 0, atHome: true, motorAmps: 0, batteryV: 12.6 }

  it('starts opening on the open command without touching its input', () => {
    const before = begin(0)
    const after = controllerStep(before, idle)
    expect(after.mode).toBe(OPENING)
    expect(before.mode).toBe(CLOSED)
  })

  it('refuses to move on a weak battery', () => {
    expect(controllerStep(begin(0), { ...idle, batteryV: 11.9 }).mode).toBe(LOW_BATTERY)
  })
})

describe('auto cover simulator', () => {
  it('rests closed on the home switch at power up', () => {
    const s = run(defaults, 1)
    expect(s.ctl.mode).toBe(CLOSED)
    expect(s.motorAmps).toBe(0)
  })

  it('opens fully in about ten seconds and switches the motor off', () => {
    const p = { ...defaults, target: CMD_OPEN }
    const s = run(p, 10)
    expect(s.position).toBeGreaterThan(FULL_TURNS * 0.8)
    run(p, 6, s)
    expect(s.ctl.mode).toBe(OPEN)
    expect(s.position).toBeCloseTo(FULL_TURNS, 0)
    expect(s.motorAmps).toBe(0)
  })

  it('winds back and stops on the home switch', () => {
    const s = run({ ...defaults, target: CMD_CLOSE }, 20, opened())
    expect(s.ctl.mode).toBe(CLOSED)
    expect(s.position).toBeLessThanOrEqual(0.05)
    expect(s.motorAmps).toBe(0)
  })

  it('pauses where it is on stop', () => {
    const s = run({ ...defaults, target: CMD_STOP }, 2, run({ ...defaults, target: CMD_OPEN }, 4))
    expect(s.ctl.mode).toBe(PAUSED)
    expect(s.position).toBeGreaterThan(1)
    expect(s.position).toBeLessThan(FULL_TURNS - 1)
  })

  it('cuts the motor quickly when the drum jams', () => {
    const s = run({ ...defaults, target: CMD_OPEN, fault: FAULT_JAM }, 20)
    expect(s.ctl.mode).toBe(STALLED)
    expect(s.motorAmps).toBe(0)
    expect(s.stallSeconds).toBeLessThan(0.5)
  })

  it('stops within two turns when the hall sensor dies', () => {
    const s = run({ ...defaults, target: CMD_OPEN, fault: FAULT_HALL_DEAD }, 20)
    expect(s.ctl.mode).toBe(SENSOR_LOST)
    expect(s.motorAmps).toBe(0)
    expect(s.position).toBeLessThan(2.5)
  })

  it('stops instead of winding the cover backwards when the home switch dies', () => {
    const s = run({ ...defaults, target: CMD_CLOSE, fault: FAULT_HOME_DEAD }, 20, opened())
    expect(s.ctl.mode).toBe(SENSOR_LOST)
    expect(s.position).toBeGreaterThan(-1.5)
  })

  it('does nothing on a battery the cutoff module has disconnected', () => {
    const s = run({ ...defaults, target: CMD_OPEN, battery: 11.5 }, 5)
    expect(s.powered).toBe(false)
    expect(s.position).toBe(0)
    expect(s.standbyAmps).toBe(0)
  })

  it('refuses to open below 12V so the car still starts', () => {
    const s = run({ ...defaults, target: CMD_OPEN, battery: 11.9 }, 5)
    expect(s.ctl.mode).toBe(LOW_BATTERY)
    expect(s.position).toBe(0)
  })

  it('draws under 40mA while parked', () => {
    const s = opened()
    expect(s.standbyAmps).toBeGreaterThan(0)
    expect(s.standbyAmps).toBeLessThan(0.04)
  })
})

describe('auto cover kit', () => {
  it('is registered', () => {
    expect(findCircuit('auto-cover')).toBeDefined()
    expect(circuits.map(c => c.id)).toContain('auto-cover')
  })

  it('draws the car in every state', () => {
    const states = [defaults, { ...defaults, target: CMD_OPEN }, { ...defaults, target: CMD_OPEN, fault: FAULT_JAM }]
    states.forEach(p => expect(livePreview.render(run(p, 3), p)).toMatch(/^<svg[\s\S]*<\/svg>$/))
  })

  it('costs a fraction of the $299 product', () => {
    const total = bom.filter((r): r is BomItem => !('g' in r)).filter(r => r.on && !r.car).reduce((s, r) => s + r.q * r.p, 0)
    expect(total).toBeGreaterThan(4000)
    expect(total).toBeLessThan(12000)
  })

  it('has a checklist and a test for every build step', () => {
    steps.forEach(s => {
      expect(s.c.length, s.t).toBeGreaterThan(0)
      expect(s.x.length, s.t).toBeGreaterThan(0)
    })
  })

  it('uses the same limits in the firmware as in the simulator', () => {
    expect(FIRMWARE).toMatch(new RegExp('FULL_TURNS = ' + FULL_TURNS + '\\b'))
    expect(FIRMWARE).toMatch(/MIN_RUN_MV = 12000\b/)
  })
})

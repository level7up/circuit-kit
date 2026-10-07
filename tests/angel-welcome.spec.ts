import { describe, expect, it } from 'vitest'
import { POWER_OFF, POWER_ON, angelSim, defaults, welcomeTime, type AngelParams, type AngelState } from '../src/circuits/angel-eye/simulate'
import { LOCKED, UNLOCKED, WELCOME_OFF } from '../src/circuits/angel-eye/welcome'
import { welcomeLayout, welcomeSchematic } from '../src/circuits/angel-eye/welcome-board'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import type { PerfLayout } from '../src/types/circuit'

const STEP = 0.01
const parked: AngelParams = { ...defaults, power: POWER_OFF, lock: LOCKED }

function run(s: AngelState, p: AngelParams, seconds: number): AngelState {
  for (let t = 0; t < seconds; t += STEP) angelSim.step(s, p, STEP)
  return s
}

function litSeconds(p: AngelParams, flipTo: number): number {
  const s = run(angelSim.init(p), p, 1)
  const flipped = { ...p, lock: flipTo }
  let lit = 0
  for (let t = 0; t < 15; t += STEP) {
    angelSim.step(s, flipped, STEP)
    if (s.on) lit += STEP
  }
  return lit
}

describe('angel eye welcome light', () => {
  it('stays dark while parked and nothing happens', () => {
    expect(run(angelSim.init(parked), parked, 3).on).toBe(false)
  })

  it('lights for about 5 seconds after unlocking', () => {
    const lit = litSeconds(parked, UNLOCKED)
    expect(lit).toBeGreaterThan(4.5)
    expect(lit).toBeLessThan(6)
  })

  it('lights for about 5 seconds after locking', () => {
    const lit = litSeconds({ ...parked, lock: UNLOCKED }, LOCKED)
    expect(lit).toBeGreaterThan(4.5)
    expect(lit).toBeLessThan(6)
  })

  it('does nothing when the welcome option is off', () => {
    expect(litSeconds({ ...parked, welcome: WELCOME_OFF }, UNLOCKED)).toBe(0)
  })

  it('switches off in one step instead of fading', () => {
    const s = run(angelSim.init(parked), parked, 1)
    const open = { ...parked, lock: UNLOCKED, style: 0 }
    const levels: number[] = []
    for (let t = 0; t < 8; t += STEP) {
      angelSim.step(s, open, STEP)
      levels.push(s.br)
    }
    const lit = levels.filter(b => b > 0)
    expect(Math.min(...lit)).toBeCloseTo(Math.max(...lit), 5)
  })

  it('reports a time close to the simulated one', () => {
    expect(welcomeTime(parked)).toBeGreaterThan(4.5)
    expect(welcomeTime(parked)).toBeLessThan(6)
  })

  it('keeps the parking light working on its own', () => {
    const p = { ...parked, power: POWER_ON }
    expect(run(angelSim.init(p), p, 2).on).toBe(true)
  })
})

describe('angel eye welcome board', () => {
  const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
    ...layout,
    parts: layout.parts.filter(p => p.s <= s),
    traces: layout.traces.filter(t => t.s <= s)
  })

  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(welcomeLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const wired = Object.fromEntries(welcomeLayout.parts.filter(p => p.k !== 'pad').map(p => [p.id, p.nets]))
    expect(wired).toEqual(welcomeSchematic)
  })

  it('never shorts two nets while it is being built', () => {
    const stages = [...new Set(welcomeLayout.parts.map(p => p.s))]
    stages.forEach(s => expect(verifyPerfboard(upTo(welcomeLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })

  it('fits a piece cut from a 5x7 cm board', () => {
    expect(welcomeLayout.cols * 2.54).toBeLessThanOrEqual(70)
    expect(welcomeLayout.rows * 2.54).toBeLessThanOrEqual(50)
  })
})

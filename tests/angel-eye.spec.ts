import { describe, expect, it } from 'vitest'
import { circuits } from '../src/circuits'
import { fadeStyles } from '../src/circuits/angel-eye/styles'
import { SCHEMATIC, dotLayout, veroLayout } from '../src/circuits/angel-eye/vero'
import {
  AUTO_ON_S, POWER_AUTO, POWER_OFF, POWER_ON, angelSim, defaults, fadeTime, maxCurrent, ringDiameterCm, ringNeed, supplyOf,
  type AngelParams, type AngelState
} from '../src/circuits/angel-eye/simulate'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'
import { verifyStripLayout } from '../src/lib/perfboard/strips'
import type { PerfLayout } from '../src/types/circuit'

const STEP = 0.001
const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})
const stagesOf = (layout: PerfLayout) => [...new Set(layout.parts.map(p => p.s))]

function run(p: AngelParams, seconds: number, from: AngelState = angelSim.init(p)): AngelState {
  const s = { ...from }
  for (let t = 0; t < seconds; t += STEP) angelSim.step(s, p, STEP)
  return s
}

describe('angel eye board', () => {
  it('wires every part to its schematic net', () => {
    expect(Object.fromEntries(veroLayout.parts.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('has no clashes, shorts or broken nets on the vero board', () => {
    expect(verifyStripLayout(veroLayout)).toEqual([])
  })

  it('has no clashes, shorts or broken nets on the dot board', () => {
    expect(verifyPerfboard(dotLayout)).toEqual([])
  })

  it('never shorts two nets while it is being built', () => {
    stagesOf(veroLayout).forEach(s => {
      expect(verifyStripLayout(upTo(veroLayout, s)).filter(p => p.kind !== 'split'), 'vero stage ' + s).toEqual([])
      expect(verifyPerfboard(upTo(dotLayout, s)).filter(p => p.kind !== 'split'), 'dot stage ' + s).toEqual([])
    })
  })

  it('fits a piece cut from a 3x7 cm board', () => {
    expect(veroLayout.cols * 2.54).toBeLessThanOrEqual(70)
    expect(veroLayout.rows * 2.54).toBeLessThanOrEqual(30)
  })
})

describe('angel eye simulator', () => {
  it('fades the two default rings in within about a second', () => {
    expect(fadeTime(defaults)).toBeGreaterThan(0.5)
    expect(fadeTime(defaults)).toBeLessThan(1.2)
  })

  it('lights instantly when wired straight', () => {
    const direct = { ...defaults, fade: 0, power: POWER_ON }
    expect(fadeTime(direct)).toBe(0)
    expect(run(direct, 0.01).br).toBe(1)
  })

  it('fades slower with a bigger capacitor', () => {
    const times = [47e-6, 100e-6, 220e-6].map(Cf => fadeTime({ ...defaults, Cf }))
    expect(times[0]).toBeLessThan(times[1])
    expect(times[1]).toBeLessThan(times[2])
  })

  it('can drive both rings even on a 14.4V charging system', () => {
    const hot = { ...defaults, Vin: 14.4 }
    expect(maxCurrent(hot)).toBeGreaterThan(ringNeed(hot, supplyOf(hot, true)))
  })

  it('cannot reach full light with a 47k base resistor on two rings', () => {
    expect(fadeTime({ ...defaults, Rb: 47e3, Vin: 14.4 })).toBe(Infinity)
  })

  it('starts dark, ends bright and goes dark when the lights go off', () => {
    const p = { ...defaults, power: POWER_AUTO }
    expect(run(p, 0.02).br).toBeLessThan(0.1)
    expect(run(p, AUTO_ON_S - 0.5).br).toBeGreaterThan(0.95)
    expect(run(p, AUTO_ON_S + 0.5).br).toBe(0)
  })

  it('skips most of the fade when switched back on straight away', () => {
    const p = { ...defaults, power: POWER_ON }
    const lit = run(p, 3)
    const dark = run({ ...p, power: POWER_OFF }, 0.3, lit)
    expect(run(p, 0.02, dark).br).toBeGreaterThan(0.5)
  })

  it('stays dark while the lights are off', () => {
    expect(run({ ...defaults, power: POWER_OFF }, 2).br).toBe(0)
  })

  it('sizes a six-piece ring at about 10 cm', () => {
    expect(ringDiameterCm(6)).toBeCloseTo(10, 0)
  })
})

describe('angel eye fade styles', () => {
  it('marks the kit values as the classic fade', () => {
    expect(fadeStyles.filter(s => s.isActive(defaults)).map(s => s.id)).toEqual(['classic'])
  })

  it('makes each style active once applied', () => {
    fadeStyles.forEach(s => {
      const p = s.apply(defaults)
      expect(fadeStyles.filter(o => o.isActive(p)).map(o => o.id), s.id).toEqual([s.id])
    })
  })

  it('only asks to buy a different capacitor', () => {
    const bought = fadeStyles.flatMap(s => s.parts.filter(p => p.buy).map(p => p.id))
    expect(new Set(bought)).toEqual(new Set(['C2']))
  })
})

describe('circuit list', () => {
  it('offers the angel eye next to the flicker', () => {
    expect(circuits.map(c => c.id)).toEqual(['parking-flicker', 'angel-eye'])
  })
})

describe('angel eye interactive steps', () => {
  const angel = circuits.find(c => c.id === 'angel-eye')!
  const flicker = circuits.find(c => c.id === 'parking-flicker')!

  it('gives every build step an illustrated walkthrough', () => {
    angel.steps!.items.forEach(s => {
      expect(s.scene?.length, s.t).toBeGreaterThan(0)
      s.scene!.forEach(f => {
        expect(f.svg.length).toBeGreaterThan(0)
        expect(f.say).not.toMatch(/undefined|NaN/)
        expect(f.svg).not.toMatch(/undefined|NaN/)
      })
    })
  })

  it('keeps every tappable point inside the drawing', () => {
    angel.steps!.items.flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeGreaterThanOrEqual(0)
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeGreaterThanOrEqual(0)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })

  it('opens the dot board first in both circuits', () => {
    expect(angel.assembly!.boards[0].id).toBe('dot')
    expect(flicker.assembly!.boards[0].id).toBe('dot37')
  })
})

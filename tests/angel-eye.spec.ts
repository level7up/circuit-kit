import { describe, expect, it } from 'vitest'
import { circuits } from '../src/circuits'
import { lightStyles } from '../src/circuits/angel-eye/styles'
import { SCHEMATIC, dotLayout, veroLayout } from '../src/circuits/angel-eye/vero'
import {
  LED_RING, OLD_TV, POWER_OFF, POWER_ON, STEADY, angelSim, withLook, defaults, ledsPerRing, perSegment, ringCurrent, ringDiameterCm,
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
  const s = { ...from, fl: { ...from.fl, ph: [...from.fl.ph], v: [...from.fl.v] } }
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
  it('lights fully as soon as the parking lights are on', () => {
    expect(run({ ...defaults, style: STEADY, power: POWER_ON }, 0.002).br).toBe(1)
  })

  it('goes dark as soon as the parking lights are off', () => {
    const lit = run({ ...defaults, style: STEADY, power: POWER_ON }, 0.5)
    expect(run({ ...defaults, style: STEADY, power: POWER_OFF }, 0.002, lit).br).toBe(0)
  })

  it('stays at one steady brightness with no animation in steady style', () => {
    const p = { ...defaults, style: STEADY, power: POWER_ON }
    const levels = new Set<number>()
    let s = run(p, 0.01)
    for (let i = 0; i < 50; i++) {
      s = run(p, 0.05, s)
      levels.add(s.br)
    }
    expect([...levels]).toEqual([1])
  })

  it('flickers like an old TV on the flicker circuit', () => {
    const p = { ...defaults, power: POWER_ON, style: OLD_TV }
    let s = run(p, 0.5)
    const levels: number[] = []
    for (let i = 0; i < 400; i++) {
      s = run(p, 0.01, s)
      levels.push(s.br)
    }
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(0.3)
    expect(Math.max(...levels)).toBeGreaterThan(0.7)
  })

  it('stays dark in old TV style while the lights are off', () => {
    expect(run({ ...defaults, power: POWER_OFF, style: OLD_TV }, 1).br).toBe(0)
  })

  it('keeps each strip piece under 30 mA with the engine running', () => {
    const p = { ...defaults, Vin: 13.8 }
    const perPiece = perSegment(p, ringCurrent(p, true))
    expect(perPiece).toBeGreaterThan(0.015)
    expect(perPiece).toBeLessThan(0.03)
  })

  it('sizes a six-piece ring at about 10 cm', () => {
    expect(ringDiameterCm(6)).toBeCloseTo(10, 0)
  })
})

describe('angel eye light styles', () => {
  it('starts as an old TV flicker', () => {
    expect(defaults.style).toBe(OLD_TV)
    expect(lightStyles.filter(s => s.isActive(defaults)).map(s => s.id)).toEqual(['tv'])
  })

  it('makes each style active once applied', () => {
    lightStyles.forEach(s => {
      const p = s.apply(defaults)
      expect(lightStyles.filter(o => o.isActive(p)).map(o => o.id), s.id).toEqual([s.id])
    })
  })

  it('needs nothing new for the steady ring', () => {
    expect(lightStyles.find(s => s.id === 'steady')!.parts.some(p => p.buy)).toBe(false)
  })
})

describe('circuit list', () => {
  it('offers the angel eye next to the flicker', () => {
    expect(circuits.map(c => c.id)).toEqual(['parking-flicker', 'angel-eye', 'theater-chase'])
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
    expect(angel.assembly!.boards[0].id).toBe('tv-dot')
    expect(flicker.assembly!.boards[0].id).toBe('dot37')
  })
})

describe('angel eye old TV board and parts list', () => {
  const angel = circuits.find(c => c.id === 'angel-eye')!
  const tvBoardsOnly = angel.assembly!.boards.filter(b => b.id.startsWith('tv-'))
  const valueOf = (board: (typeof tvBoardsOnly)[number], id: string) => board.layout.parts.find(p => p.id === id)?.val

  it('offers the full flicker circuit on dot and vero boards', () => {
    expect(tvBoardsOnly.map(b => b.id)).toEqual(['tv-dot', 'tv-vero'])
  })

  it('uses the old TV values on the board', () => {
    tvBoardsOnly.forEach(b => {
      expect([valueOf(b, 'R1'), valueOf(b, 'R2'), valueOf(b, 'R3'), valueOf(b, 'C8')], b.id).toEqual(['220kΩ', '47kΩ', '10kΩ', '1µF'])
      expect(valueOf(b, 'Q1'), b.id).toBe('TIP122')
    })
  })

  it('never mentions the candle values in the TV board texts', () => {
    tvBoardsOnly.forEach(b => {
      const texts = [b.note, ...b.phases.flatMap(p => [p.t, p.m, p.b, p.x, ...p.c]), ...b.layout.parts.flatMap(p => [p.val, p.tip])].join(' ')
      expect(texts, b.id).not.toMatch(/1MΩ|390k|100kΩ|22µF|\b1M\b/)
    })
  })

  it('keeps the TV boards wired exactly like the flicker boards', () => {
    tvBoardsOnly.forEach(b => {
      const problems = b.layout.strips && b.layout.look !== 'breadboard' ? verifyStripLayout(b.layout) : verifyPerfboard(b.layout)
      expect(problems, b.id).toEqual([])
    })
  })

  it('lists every TV value in the parts list', () => {
    const items = angel.bom!.rows.filter((r): r is Extract<typeof r, { n: string }> => 'n' in r)
    const specs = items.map(r => r.s).join(' | ')
    expect(specs).toContain('220kΩ')
    expect(specs).toContain('CD40106')
    expect(specs).toContain('TIP122')
    expect(specs).not.toMatch(/1MΩ|390kΩ|100kΩ|22µF/)
    expect(items.find(r => r.s.startsWith('1µF'))?.q).toBe(4)
    expect(items.find(r => r.s.startsWith('10kΩ'))?.q).toBe(3)
    expect(items.find(r => r.s.startsWith('47kΩ'))?.q).toBe(2)
  })
})

describe('angel eye 5 mm LED ring option', () => {
  const angel = circuits.find(c => c.id === 'angel-eye')!

  it('offers both ring methods in the steps tab', () => {
    expect(angel.steps!.variants!.map(v => v.id)).toEqual(['strip', 'leds'])
  })

  it('illustrates every 5 mm step and shares the circuit and car steps', () => {
    const [strip, leds] = angel.steps!.variants!
    leds.items.forEach(s => expect(s.scene?.length, s.t).toBeGreaterThan(0))
    expect(leds.items.slice(-4).map(s => s.t)).toEqual(strip.items.slice(-4).map(s => s.t))
  })

  it('keeps 5 mm scene points inside the drawing', () => {
    angel.steps!.variants![1].items.flatMap(s => s.scene ?? []).flatMap(f => f.spots ?? []).forEach(spot => {
      expect(spot.x, spot.t).toBeGreaterThanOrEqual(0)
      expect(spot.x, spot.t).toBeLessThanOrEqual(SCENE_W)
      expect(spot.y, spot.t).toBeGreaterThanOrEqual(0)
      expect(spot.y, spot.t).toBeLessThanOrEqual(SCENE_H)
    })
  })

  it('runs each 3-LED group near 19 mA with the engine running', () => {
    const p = { ...defaults, style: STEADY, ringType: LED_RING, Vin: 13.8 }
    expect(perSegment(p, ringCurrent(p, true))).toBeCloseTo(0.0186, 3)
  })

  it('names the 5 mm ring so the drawings show a ring', () => {
    expect(withLook({ ...defaults, ringType: LED_RING }).lampName).toBe('حلقتين 18 LED 5mm')
  })
})

describe('angel eye LED counts', () => {
  it('counts 5 LEDs per strip piece and 3 per 5mm LED group', () => {
    expect(ledsPerRing(defaults)).toBe(30)
    expect(ledsPerRing({ ...defaults, ringType: LED_RING })).toBe(18)
    expect(defaults.lampName).toContain('30')
  })
})

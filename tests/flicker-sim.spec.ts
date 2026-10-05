import { describe, expect, it } from 'vitest'
import { applySwaps } from '../src/composables/useSimulation'
import { board } from '../src/circuits/parking-flicker/board'
import { defaults, flickerSim, type FlickerParams } from '../src/circuits/parking-flicker/simulate'

interface Stats { min: number; max: number; avg: number; offShare: number; slowFlips: number }

function run(p: FlickerParams, seconds = 6): Stats {
  const s = flickerSim.init(p)
  s.ph = [0.1, 0.4, 0.7]
  for (let i = 0; i < 3000; i++) flickerSim.step(s, p, 0.001)
  let min = 1, max = 0, sum = 0, off = 0, flips = 0, last = s.v[0]
  const n = seconds * 1000
  for (let i = 0; i < n; i++) {
    flickerSim.step(s, p, 0.001)
    min = Math.min(min, s.br); max = Math.max(max, s.br); sum += s.br
    if (s.br < 0.02) off++
    if (s.v[0] !== last) { flips++; last = s.v[0] }
  }
  return { min, max, avg: sum / n, offShare: off / n, slowFlips: flips }
}

const swap = (key: string, index: number, base: FlickerParams = defaults) => ({ ...applySwaps(base, { [key]: index }, board.alternatives), lampMode: base.lampMode })
function pick(key: string, text: string): number {
  const i = board.alternatives[key].findIndex(o => o.t.includes(text))
  if (i < 1) throw new Error(`no alternative "${text}" in ${key}`)
  return i
}

describe('parking flicker simulation', () => {
  const t10 = swap('lamp', pick('lamp', 'التصميم الأصلي'))
  const original = run(t10)
  const strip = run(defaults)

  it('flickers a single T10 without ever going dark in the original design', () => {
    expect(t10.emitter).toEqual([68, 68])
    expect(original.min).toBeGreaterThan(0.3)
    expect(original.max).toBe(1)
    expect(original.offShare).toBe(0)
  })

  it('drives the default 20 LED strip to full brightness without going dark', () => {
    expect(defaults.emitter).toEqual([68, 68, 68])
    expect(strip.max).toBeGreaterThan(0.97)
    expect(strip.min).toBeGreaterThan(0.2)
    expect(strip.offShare).toBe(0)
  })

  it('goes fully dark at times without R7', () => {
    expect(run(swap('r7', pick('r7', 'من غيرها'))).offShare).toBeGreaterThan(0.05)
  })

  it('stays dark with 68kΩ in place of 68Ω', () => {
    expect(run(swap('r89', pick('r89', '68kΩ'))).max).toBeLessThan(0.01)
  })

  it('has no 5V when a 78L05 sits unrotated in the 7805 holes', () => {
    expect(run(swap('reg', pick('reg', 'من غير ما تلفّه'))).max).toBe(0)
  })

  it('stops flickering with a 74LS14', () => {
    const r = run(swap('ic', pick('ic', '74LS14')))
    expect(r.max - r.min).toBeLessThan(0.01)
    expect(r.slowFlips).toBe(0)
  })

  it('slows the oscillators tenfold with 10µF timing caps', () => {
    expect(run(swap('ct', pick('ct', '10µF'))).slowFlips).toBeLessThan(original.slowFlips / 5)
  })

  it('is dim with an incandescent W5W bulb', () => {
    expect(run(swap('lamp', pick('lamp', 'W5W عادية'))).max).toBeLessThan(0.4)
  })

  it('kills the test LED without its resistor', () => {
    const led = { ...defaults, lampMode: 'led' as const }
    expect(run(swap('rled', pick('rled', 'من غير مقاومة'), led)).max).toBe(0)
  })

  describe('lamp and LED kinds', () => {
    const led = { ...defaults, lampMode: 'led' as const }
    const ripple = (r: Stats) => r.max - r.min

    it('smooths the flicker with a slow filament bulb', () => {
      const filament = run(swap('lamp', pick('lamp', 'C5W أم فتلة')))
      const ledLamp = run(swap('lamp', pick('lamp', 'C5W LED')))
      expect(ripple(filament)).toBeLessThan(ripple(ledLamp))
    })

    it('barely lights a 21W bulb', () => {
      expect(run(swap('lamp', pick('lamp', '21 وات'))).max).toBeLessThan(0.1)
    })

    it('runs a bare 1W LED at less than half its power', () => {
      const r = run(swap('lamp', pick('lamp', 'LED باور')))
      expect(r.max).toBeGreaterThan(0.3)
      expect(r.max).toBeLessThan(0.5)
    })

    it('lights a 50cm strip only partly', () => {
      expect(run(swap('lamp', pick('lamp', '50 سم'))).max).toBeLessThan(0.6)
    })

    it('gets a red LED brighter than a white one on the same resistor', () => {
      const red = run(swap('led', pick('led', 'أحمر'), led))
      const white = run(swap('led', pick('led', 'أبيض أو أزرق'), led))
      expect(red.avg).toBeGreaterThan(white.avg)
    })

    it('interrupts the flicker with a flashing LED', () => {
      expect(run(swap('led', pick('led', 'Flashing'), led)).offShare).toBeGreaterThan(0.3)
    })

    it('barely flickers a desk-test LED with the car values of R8/R9', () => {
      expect(ripple(run(led))).toBeLessThan(0.1)
    })

    it('flickers the desk-test LED clearly with a single 220Ω for R8/R9', () => {
      expect(ripple(run(swap('r89', pick('r89', '220Ω'), led)))).toBeGreaterThan(0.3)
    })

    it('shows no visible light from an IR LED', () => {
      expect(run(swap('led', pick('led', 'IR'), led)).max).toBe(0)
    })
  })

  describe('substitutes when 68Ω is not available', () => {
    const led = { ...defaults, lampMode: 'led' as const }
    const close = (r: Stats) => Math.abs(r.avg - original.avg) / original.avg

    it('matches the original lamp with 3 × 100Ω in parallel', () => {
      const p = swap('r89', pick('r89', '3 × 100Ω على'), t10)
      expect(p.emitter).toEqual([100, 100, 100])
      expect(close(run(p))).toBeLessThan(0.03)
    })

    it.each([['2 × 82Ω', 0.15], ['2 × 56Ω', 0.1], ['2 × 47Ω', 0.15]])('keeps the lamp flickering and bright with %s', (text, tolerance) => {
      const r = run(swap('r89', pick('r89', text), t10))
      expect(close(r)).toBeLessThan(tolerance)
      expect(r.min).toBeGreaterThan(0.2)
    })

    it('makes the desk test work with the kit 470Ω on the emitter and 1kΩ on the LED', () => {
      const p = { ...applySwaps(led, { r89: pick('r89', '470Ω لوحدها'), rled: pick('rled', '1kΩ') }, board.alternatives), lampMode: 'led' as const }
      const r = run(p)
      expect(r.max - r.min).toBeGreaterThan(0.15)
      expect(r.offShare).toBeLessThan(0.05)
    })

    it('gets close to the original with 10 × 470Ω from the BOM', () => {
      const r = run(swap('r89', pick('r89', '10 × 470Ω'), t10))
      expect(r.max).toBe(1)
      expect(r.min).toBeGreaterThan(0.25)
      expect(close(r)).toBeLessThan(0.2)
    })

    it('matches the original with 14 × 470Ω', () => {
      expect(close(run(swap('r89', pick('r89', '14 × 470Ω'), t10)))).toBeLessThan(0.03)
    })

    it('draws a bundle as one resistor in the R8 spot', () => {
      const p = swap('r89', pick('r89', '10 × 470Ω'))
      const hidden = board.dynamics.hidden(p)
      expect(hidden.has('R9') && hidden.has('R10')).toBe(true)
      expect(board.dynamics.labelText('R8', 'R8 68Ω', p)).toContain('10×470Ω')
    })

    it('shows R10 on the board only when three resistors are used', () => {
      expect(board.dynamics.hidden(defaults).has('R10')).toBe(false)
      expect(board.dynamics.hidden(t10).has('R10')).toBe(true)
      expect(board.dynamics.hidden(swap('r89', pick('r89', '2 × 68Ω بس'))).has('R10')).toBe(true)
      expect(board.dynamics.hidden(swap('r89', pick('r89', '3 × 100Ω على'))).has('R10')).toBe(false)
      expect(board.dynamics.hidden(swap('r89', pick('r89', '470Ω لوحدها'))).has('R9')).toBe(true)
    })
  })

  describe('removing parts', () => {
    const without = (...ids: string[]) => board.removal.apply(defaults, new Set(ids))
    const ripple = (r: Stats) => r.max - r.min

    it('explains the effect of removing every part on the board', () => {
      expect(board.parts.map(p => p.id).filter(id => !board.removal.effects[id])).toEqual([])
    })

    it.each(['VIN', 'F1', 'D1', 'U2', 'J4', 'J5', 'Q1', 'J12', 'LAMP'])('turns the lamp off without %s', id => {
      expect(run(without(id)).max).toBeLessThan(0.01)
    })

    it('holds the lamp fully on and steady without the chip', () => {
      const r = run(without('U1'))
      expect(r.min).toBeGreaterThan(0.95)
    })

    it('stops the slow sway without R1', () => {
      expect(run(without('R1')).slowFlips).toBe(0)
    })

    it('makes the flicker harsher without C8', () => {
      expect(ripple(run(without('C8')))).toBeGreaterThanOrEqual(ripple(original))
    })

    it('lets the lamp go dark at times without R7', () => {
      expect(run(without('R7')).offShare).toBeGreaterThan(0.05)
    })

    it('dims the lamp with one emitter resistor gone and kills it with both', () => {
      expect(run(without('R8')).avg).toBeLessThan(original.avg)
      expect(run(without('R8', 'R9')).max).toBeGreaterThan(0)
      expect(run(without('R8', 'R9', 'R10')).max).toBe(0)
    })

    it('changes nothing when no part is removed', () => {
      expect(board.removal.apply(defaults, new Set())).toBe(defaults)
    })
  })

  it('keeps every alternative index valid', () => {
    const bad = Object.entries(board.alternatives).flatMap(([k, os]) => os.slice(1).filter(o => !o.st || !o.r).map(o => `${k}: ${o.t}`))
    expect(bad).toEqual([])
  })

  it('dims two lamps at the peak with the original two emitter resistors', () => {
    const r = run(swap('lamp', pick('lamp', 'لمبتين T10 (يمين وشمال) · 2 × 68Ω')))
    expect(r.max).toBeLessThan(0.95)
    expect(r.max).toBeGreaterThan(0.6)
    expect(r.offShare).toBe(0)
  })

  it.each(['3 × 68Ω', '4 × 100Ω'])('drives two lamps to full brightness with %s', text => {
    const r = run(swap('lamp', pick('lamp', 'لمبتين T10 + ' + text)))
    expect(r.max).toBeGreaterThan(0.97)
    expect(r.min).toBeGreaterThan(0.2)
    expect(r.offShare).toBe(0)
  })

  it('drives a 10 LED strip to full brightness with two 68 ohm resistors', () => {
    const r = run(swap('lamp', pick('lamp', '10 لمبات')))
    expect(r.max).toBeGreaterThan(0.97)
    expect(r.offShare).toBe(0)
  })

  it('leaves a 20 LED strip dim with only two 68 ohm resistors', () => {
    expect(run(swap('lamp', pick('lamp', '20 لمبة + 2 × 68Ω بس'))).max).toBeLessThan(0.8)
  })

  it('drives a 20 LED strip near full brightness with 4 × 100Ω', () => {
    const r = run(swap('lamp', pick('lamp', '20 لمبة + 4 × 100Ω')))
    expect(r.max).toBeGreaterThan(0.95)
    expect(r.offShare).toBe(0)
  })
})

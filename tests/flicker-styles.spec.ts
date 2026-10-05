import { describe, expect, it } from 'vitest'
import { flickerStyles } from '../src/circuits/parking-flicker/styles'
import { defaults, flickerSim, type FlickerParams } from '../src/circuits/parking-flicker/simulate'

interface Character { min: number; max: number; swingsPerS: number; jitterPerS: number }

function character(p: FlickerParams): Character {
  const s = flickerSim.init(p)
  s.ph = [0.1, 0.4, 0.7]
  for (let i = 0; i < 5000; i++) flickerSim.step(s, p, 0.001)
  const xs: number[] = []
  for (let i = 0; i < 20000; i++) { flickerSim.step(s, p, 0.001); xs.push(s.br) }
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  let jitter = 0
  let swings = 0
  for (let i = 10; i < xs.length; i += 10) {
    jitter += Math.abs(xs[i] - xs[i - 10])
    if ((xs[i] - mean) * (xs[i - 10] - mean) < 0) swings++
  }
  return { min: Math.min(...xs), max: Math.max(...xs), swingsPerS: swings / 20, jitterPerS: jitter / 20 }
}

function dipsOf(id: string): { perSecond: number; gaps: number[]; min: number; max: number } {
  const style = flickerStyles.find(s => s.id === id)!
  const p = style.apply(defaults)
  const s = flickerSim.init(p)
  s.ph = [0.1, 0.4, 0.7]
  for (let i = 0; i < 6000; i++) flickerSim.step(s, p, 0.0005)
  const dips: number[] = []
  let below = false
  let min = 1
  let max = 0
  for (let i = 0; i < 40000; i++) {
    flickerSim.step(s, p, 0.0005)
    min = Math.min(min, s.br)
    max = Math.max(max, s.br)
    if (s.br < 0.3 && !below) { dips.push(i * 0.5); below = true }
    if (s.br > 0.6) below = false
  }
  return { perSecond: dips.length / 20, gaps: dips.slice(1).map((d, i) => d - dips[i]), min, max }
}

const byId = (id: string) => {
  const style = flickerStyles.find(s => s.id === id)
  if (!style) throw new Error('no style ' + id)
  return character(style.apply(defaults))
}

describe('flicker styles', () => {
  const candle = byId('candle')

  it('keeps the original design as the candle style', () => {
    const candleStyle = flickerStyles.find(s => s.id === 'candle')!
    expect(candleStyle.isActive(defaults)).toBe(true)
    expect(candleStyle.parts.every(p => !p.buy)).toBe(true)
  })

  it('makes fire livelier than the candle', () => {
    expect(byId('fire').swingsPerS).toBeGreaterThan(candle.swingsPerS * 1.5)
  })

  it('makes the old TV much faster and jumpier than the candle', () => {
    const tv = byId('tv')
    expect(tv.jitterPerS).toBeGreaterThan(candle.jitterPerS * 5)
    expect(tv.swingsPerS).toBeGreaterThan(candle.swingsPerS * 4)
  })

  it('makes breathing slow and smooth', () => {
    const breath = byId('breath')
    expect(breath.swingsPerS).toBeLessThan(candle.swingsPerS / 2)
    expect(breath.jitterPerS).toBeLessThan(candle.jitterPerS / 2)
  })

  it.each(flickerStyles.map(s => s.id).filter(id => id !== 'hard'))('never lets the strip go dark with %s', id => {
    expect(byId(id).min).toBeGreaterThan(0.15)
  })

  it('marks a part to buy exactly when its value differs from the original', () => {
    const original = Object.fromEntries(flickerStyles[0].parts.map(p => [p.id, p.value]))
    flickerStyles.forEach(s => s.parts.forEach(p => expect(p.buy, `${s.id} ${p.id}`).toBe(p.value !== original[p.id])))
  })

  it('recognises each style after applying it', () => {
    flickerStyles.forEach(s => {
      const applied = s.apply(defaults)
      expect(flickerStyles.filter(o => o.isActive(applied)).map(o => o.id)).toEqual([s.id])
    })
  })

  it('makes the hard style drop near dark about five times a second', () => {
    const { perSecond, min, max } = dipsOf('hard')
    expect(perSecond).toBeGreaterThan(3)
    expect(perSecond).toBeLessThan(7)
    expect(min).toBeLessThan(0.05)
    expect(max).toBeGreaterThan(0.95)
  })

  it('spaces the hard style dips unevenly with no short repeating rhythm', () => {
    const { gaps } = dipsOf('hard')
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const spread = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length) / mean
    expect(spread).toBeGreaterThan(0.15)
    const repeatsWithin = (k: number) => gaps.slice(0, gaps.length - k).every((g, i) => Math.abs(g - gaps[i + k]) < 6)
    expect([...Array(20).keys()].slice(1).filter(repeatsWithin)).toEqual([])
  })
})

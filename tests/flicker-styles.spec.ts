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

  it('makes the hard style much faster than the old TV but still visible as flicker', () => {
    const hard = byId('hard')
    const tv = byId('tv')
    expect(hard.swingsPerS).toBeGreaterThan(tv.swingsPerS * 1.5)
    expect(hard.swingsPerS).toBeLessThan(40)
  })

  it('lets the hard style dip to dark only briefly', () => {
    expect(byId('hard').min).toBeLessThan(0.05)
    expect(byId('hard').max).toBeGreaterThan(0.95)
  })
})

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

function blinkSegments(): { on: number[]; off: number[]; halfLit: number } {
  const p = flickerStyles.find(x => x.id === 'blink')!.apply(defaults)
  const s = flickerSim.init(p)
  s.ph = [0.1, 0.4, 0.7]
  const dt = 0.002
  for (let i = 0; i < 5000; i++) flickerSim.step(s, p, dt)
  const on: number[] = []
  const off: number[] = []
  let state: 'on' | 'off' | null = null
  let start = 0
  let half = 0
  for (let i = 0; i < 120 / dt; i++) {
    flickerSim.step(s, p, dt)
    const next: 'on' | 'off' | null = s.br < 0.12 ? 'off' : s.br > 0.7 ? 'on' : state
    if (s.br >= 0.12 && s.br <= 0.7) half++
    if (next !== state) {
      if (state === 'on') on.push(i * dt - start)
      if (state === 'off') off.push(i * dt - start)
      state = next
      start = i * dt
    }
  }
  return { on: on.slice(1), off: off.slice(1), halfLit: (half * dt) / 120 }
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

  it.each(flickerStyles.map(s => s.id).filter(id => id !== 'blink'))('never lets the strip go dark with %s', id => {
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



  it('blinks fully on or fully off with almost no half-lit time', () => {
    expect(blinkSegments().halfLit).toBeLessThan(0.05)
  })

  it('keeps the blink lit for one to two seconds and dark for under a second', () => {
    const { on, off } = blinkSegments()
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
    expect(mean(on)).toBeGreaterThan(1)
    expect(mean(on)).toBeLessThan(2)
    expect(mean(off)).toBeGreaterThan(0.3)
    expect(mean(off)).toBeLessThan(0.8)
  })

  it('varies the blink lengths instead of repeating one rhythm', () => {
    const { on, off } = blinkSegments()
    expect(new Set(on.slice(0, 20).map(v => Math.round(v / 0.2))).size).toBeGreaterThan(4)
    expect(new Set(off.slice(0, 20).map(v => Math.round(v / 0.1))).size).toBeGreaterThan(4)
  })

  it('restores the normal R8 to R10 when leaving the blink style', () => {
    const blink = flickerStyles.find(x => x.id === 'blink')!.apply(defaults)
    const back = flickerStyles[0].apply(blink)
    expect(back.emitter).toEqual(defaults.emitter)
    expect(flickerStyles[0].isActive(back)).toBe(true)
    expect(flickerStyles[0].isActive(blink)).toBe(false)
  })
})

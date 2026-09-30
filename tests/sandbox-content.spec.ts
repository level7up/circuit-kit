import { describe, expect, it } from 'vitest'
import { EXAMPLES, explain, recommendedResistor } from '../src/lab/sandbox-content'
import { canPlace, legsFor, occupied, orientationOf } from '../src/lib/sandbox/placement'
import { solve, type SandboxPart } from '../src/lib/sandbox/solver'

const build = (key: string, patch: (p: SandboxPart) => SandboxPart = p => p) => {
  const ex = EXAMPLES.find(e => e.key === key)!
  const parts = ex.parts.map((p, i) => patch({ ...p, id: 'p' + i }))
  return { parts, supply: ex.supply, result: solve(parts, ex.supply) }
}

describe('sandbox examples and explanations', () => {
  it.each(EXAMPLES.map(e => [e.key]))('places every part of the %s example on free, real holes', key => {
    const { parts } = build(key)
    parts.forEach((p, i) => expect(canPlace(p.a, p.b, occupied(parts.slice(0, i)))).toBe(true))
  })

  it.each(EXAMPLES.map(e => [e.key]))('uses the real leg spacing of every part in the %s example', key => {
    const { parts } = build(key)
    for (const p of parts.filter(x => x.kind !== 'wire')) {
      const legs = legsFor(p.a, p.kind as never, orientationOf(p))
      expect({ id: p.id, ...legs }).toEqual({ id: p.id, a: p.a, b: p.b, ...(p.c ? { c: p.c } : {}) })
    }
  })

  it('turns the bulb on only while the transistor button is pressed', () => {
    const off = build('npn')
    const on = build('npn', p => (p.kind === 'button' ? { ...p, pressed: true } : p))
    expect(off.result.parts.p1.brightness).toBeLessThan(0.01)
    expect(on.result.parts.p1.brightness).toBeGreaterThan(0.4)
    expect(on.result.burnedNow).toEqual([])
  })

  it('lights the night-light LED only in the dark', () => {
    const bright = build('ldr')
    const dark = build('ldr', p => (p.kind === 'ldr' ? { ...p, level: 0.1 } : p))
    expect(bright.result.parts.p8.ledState).toBe('off')
    expect(dark.result.parts.p8.ledState).toBe('on')
  })

  it('dims the potentiometer example without ever burning the LED', () => {
    for (const level of [0, 0.5, 1]) {
      const r = build('pot', p => (p.kind === 'pot' ? { ...p, level } : p)).result
      expect(r.burnedNow).toEqual([])
    }
  })

  it('lights the LED example and says so', () => {
    const { parts, supply, result } = build('led')
    expect(explain(parts, result, supply).map(m => m.st)).toContain('ok')
  })

  it('keeps the switch example dark until the switch is closed', () => {
    const open = build('switch')
    const closed = build('switch', p => (p.kind === 'switch' ? { ...p, closed: true } : p))
    expect(open.result.parts.p3.ledState).toBe('off')
    expect(closed.result.parts.p3.ledState).toBe('on')
  })

  it('burns the no-resistor example and suggests a resistor', () => {
    const { parts, supply, result } = build('burn')
    const bad = explain(parts, result, supply).find(m => m.st === 'bad')
    expect(bad?.text).toContain('470Ω')
  })

  it('suggests resistors that keep an LED at or under 15mA', () => {
    for (const v of [3, 5, 9, 12]) expect((v - 2) / recommendedResistor(v)).toBeLessThanOrEqual(0.015)
  })

  it('reports a short instead of LED messages', () => {
    const parts: SandboxPart[] = [{ id: 'w', kind: 'wire', a: 'tp5', b: 'tn5' }]
    const msgs = explain(parts, solve(parts, 5), 5)
    expect(msgs.at(-1)?.st).toBe('bad')
  })
})

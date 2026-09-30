import { describe, expect, it } from 'vitest'
import { EXAMPLES, explain, recommendedResistor } from '../src/lab/sandbox-content'
import { canPlace, occupied } from '../src/lib/sandbox/placement'
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

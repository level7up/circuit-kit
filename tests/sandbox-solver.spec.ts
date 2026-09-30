import { describe, expect, it } from 'vitest'
import { solve, type SandboxPart } from '../src/lib/sandbox/solver'

const res = (id: string, a: string, b: string, ohms: number): SandboxPart => ({ id, kind: 'res', a, b, ohms })
const led = (id: string, a: string, b: string, color: SandboxPart['color'] = 'red'): SandboxPart => ({ id, kind: 'led', a, b, color })
const wire = (id: string, a: string, b: string): SandboxPart => ({ id, kind: 'wire', a, b })

describe('sandbox DC solver', () => {
  it('splits voltage across two equal resistors', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'b10', 1000), res('r2', 'c10', 'c15', 1000), wire('w2', 'd15', 'tn15')], 10)
    expect(r.voltage('T10')).toBeCloseTo(5, 3)
    expect(r.parts.r1.current).toBeCloseTo(0.005, 5)
  })

  it('lights an LED through a resistor with about (V - Vf) / R', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'b9', 330), led('d1', 'c9', 'c10'), wire('w2', 'd10', 'tn10')], 5)
    const expected = (5 - 1.8) / (330 + 15)
    expect(r.parts.d1.ledState).toBe('on')
    expect(r.parts.d1.current).toBeCloseTo(expected, 3)
  })

  it('burns an LED connected straight across the supply', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), led('d1', 'b5', 'b6'), wire('w2', 'c6', 'tn6')], 9)
    expect(r.parts.d1.ledState).toBe('burned')
    expect(r.burnedNow).toEqual(['d1'])
  })

  it('keeps a reversed LED dark and says so', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'b9', 330), led('d1', 'c10', 'c9'), wire('w2', 'd10', 'tn10')], 5)
    expect(r.parts.d1.ledState).toBe('reversed')
    expect(r.parts.d1.current).toBe(0)
  })

  it('does nothing through a resistor with both legs in one column', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'e5', 330), led('d1', 'c5', 'c6'), wire('w2', 'd6', 'tn6')], 5)
    expect(r.parts.r1.bypassed).toBe(true)
    expect(r.parts.d1.ledState).toBe('burned')
  })

  it('detects a short across the supply', () => {
    expect(solve([wire('w1', 'tp5', 'tn5')], 5).short).toBe(true)
    expect(solve([wire('w1', 'tp5', 'tn5')], 0).short).toBe(false)
  })

  it('only conducts through a closed switch', () => {
    const circuit = (closed: boolean): SandboxPart[] => [wire('w1', 'tp5', 'a5'), { id: 's1', kind: 'switch', a: 'b5', b: 'b7', closed }, res('r1', 'c7', 'c11', 330), led('d1', 'd11', 'd12'), wire('w2', 'e12', 'tn12')]
    expect(solve(circuit(false), 5).parts.d1.ledState).toBe('off')
    expect(solve(circuit(true), 5).parts.d1.ledState).toBe('on')
  })

  it('leaves a floating part at no current instead of failing', () => {
    const r = solve([res('r1', 'a20', 'a24', 1000)], 5)
    expect(r.parts.r1.current).toBeCloseTo(0, 9)
  })

  it('warns when a small resistor gets hot', () => {
    const r = solve([wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'b9', 100), wire('w2', 'c9', 'tn9')], 12)
    expect(r.parts.r1.hot).toBe(true)
  })

  it('shares current between two LEDs in parallel, each with its own resistor', () => {
    const r = solve([
      wire('w1', 'tp5', 'a5'), res('r1', 'b5', 'b9', 470), led('d1', 'c9', 'c10'), wire('w2', 'd10', 'tn10'),
      res('r2', 'c5', 'c14', 470), led('d2', 'a14', 'a15', 'blue'), wire('w3', 'b15', 'tn15')
    ], 9)
    expect(r.parts.d1.ledState).toBe('on')
    expect(r.parts.d2.ledState).toBe('on')
    expect(r.parts.d1.current).toBeGreaterThan(r.parts.d2.current)
  })
})

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

describe('sandbox components beyond LEDs', () => {
  const feed = (from: string): SandboxPart => wire('wp', 'tp5', from)
  const ground = (from: string): SandboxPart => wire('wg', from, 'tn30')

  it('conducts through a push button only while pressed', () => {
    const circuit = (pressed: boolean): SandboxPart[] => [feed('a5'), { id: 'b1', kind: 'button', a: 'b5', b: 'b7', pressed }, res('r1', 'c7', 'c11', 470), led('d1', 'd11', 'd12'), wire('wg', 'e12', 'tn12')]
    expect(solve(circuit(false), 9).parts.d1.ledState).toBe('off')
    expect(solve(circuit(true), 9).parts.d1.ledState).toBe('on')
  })

  it('dims an LED with a potentiometer', () => {
    const circuit = (level: number): SandboxPart[] => [feed('a5'), { id: 'p1', kind: 'pot', a: 'b5', c: 'b6', b: 'b7', ohms: 10000, level }, res('r1', 'c6', 'c10', 220), led('d1', 'd10', 'd11'), wire('wg', 'e11', 'tn11')]
    const bright = solve(circuit(1), 9).parts.d1.current
    const dim = solve(circuit(0.3), 9).parts.d1.current
    expect(bright).toBeGreaterThan(dim)
    expect(solve(circuit(0), 9).parts.d1.current).toBeLessThan(0.001)
  })

  it('changes an LDR resistance with light', () => {
    const circuit = (level: number): SandboxPart[] => [feed('a5'), { id: 'l1', kind: 'ldr', a: 'b5', b: 'b7', level }, led('d1', 'c7', 'c8'), wire('wg', 'd8', 'tn8')]
    expect(solve(circuit(1), 9).parts.d1.current).toBeGreaterThan(solve(circuit(0), 9).parts.d1.current * 20)
  })

  it('switches an LED with an NPN transistor and a base resistor', () => {
    const circuit = (baseFed: boolean): SandboxPart[] => [
      feed('a5'), res('rl', 'b5', 'b9', 470), led('d1', 'c9', 'c10'),
      { id: 'q1', kind: 'npn', a: 'd10', c: 'd11', b: 'd12' }, wire('wg', 'e12', 'tn12'),
      ...(baseFed ? [wire('wb', 'tp20', 'a20'), res('rb', 'b20', 'b24', 10000), wire('wbq', 'c24', 'e11')] : [])
    ]
    const off = solve(circuit(false), 9)
    const on = solve(circuit(true), 9)
    expect(off.parts.d1.ledState).toBe('off')
    expect(off.parts.q1.transistor).toBe('off')
    expect(on.parts.d1.ledState).toBe('on')
    expect(on.parts.q1.transistor).toBe('saturated')
  })

  it('amplifies a small base current in the active region', () => {
    const r = solve([
      feed('a5'), res('rl', 'b5', 'b9', 100), { id: 'q1', kind: 'npn', a: 'c9', c: 'c10', b: 'c11' }, wire('wg', 'd11', 'tn11'),
      wire('wb', 'tp20', 'a20'), { id: 'rb', kind: 'res', a: 'b20', b: 'b24', ohms: 1e6 }, wire('wbq', 'c24', 'd10')
    ], 9)
    expect(r.parts.q1.transistor).toBe('active')
    expect(r.parts.q1.ic! / r.parts.q1.ib!).toBeCloseTo(200, 0)
  })

  it('burns a transistor whose base is fed with no resistor', () => {
    const r = solve([feed('a5'), { id: 'q1', kind: 'npn', a: 'b20', c: 'b5', b: 'b21' }, wire('wg', 'c21', 'tn21')], 9)
    expect(r.burnedNow).toContain('q1')
  })

  it('lets a diode conduct one way only', () => {
    const forward = solve([feed('a5'), { id: 'd', kind: 'diode', a: 'b5', b: 'b9' }, res('r', 'c9', 'c13', 1000), wire('wg', 'd13', 'tn13')], 9)
    const backward = solve([feed('a5'), { id: 'd', kind: 'diode', a: 'b9', b: 'b5' }, res('r', 'c9', 'c13', 1000), wire('wg', 'd13', 'tn13')], 9)
    expect(forward.parts.d.junction).toBe('on')
    expect(forward.parts.r.current).toBeCloseTo((9 - 0.7) / 1000, 3)
    expect(backward.parts.d.junction).toBe('reversed')
  })

  it('sounds a buzzer only with enough current', () => {
    expect(solve([feed('a5'), { id: 'z', kind: 'buzzer', a: 'b5', b: 'b7' }, ground('c7')], 5).parts.z.active).toBe(true)
    expect(solve([feed('a5'), { id: 'z', kind: 'buzzer', a: 'b5', b: 'b7' }, ground('c7')], 3).parts.z.active).toBe(false)
  })

  it('lights a 12V bulb fully only near 12V', () => {
    const at = (v: number) => solve([feed('a5'), { id: 'lamp', kind: 'bulb', a: 'b5', b: 'b8' }, ground('c8')], v).parts.lamp.brightness!
    expect(at(12)).toBeGreaterThan(0.95)
    expect(at(5)).toBeLessThan(0.25)
  })

  it('spins a motor faster with more voltage and not at all with too little', () => {
    const at = (v: number) => solve([feed('a5'), { id: 'm', kind: 'motor', a: 'b5', b: 'b8' }, ground('c8')], v).parts.m.speed!
    expect(at(12)).toBeGreaterThan(at(5))
    expect(at(5)).toBeGreaterThan(0)
    expect(solve([feed('a5'), res('r', 'b5', 'b9', 1000), { id: 'm', kind: 'motor', a: 'c9', b: 'c12' }, ground('d12')], 9).parts.m.speed).toBe(0)
  })
})

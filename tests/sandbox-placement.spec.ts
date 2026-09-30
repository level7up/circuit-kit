import { describe, expect, it } from 'vitest'
import { canPlace, nearestHole, occupied, secondHole, wireColorFor } from '../src/lib/sandbox/placement'
import { holeXY } from '../src/lib/breadboard/geometry'
import type { SandboxPart } from '../src/lib/sandbox/solver'

describe('sandbox placement', () => {
  it('spans a resistor four columns and an LED one', () => {
    expect(secondHole('c12', 'res', 'h')).toBe('c16')
    expect(secondHole('c12', 'led', 'h')).toBe('c13')
  })

  it('crosses the channel and reaches the rails when vertical', () => {
    expect(secondHole('d12', 'res', 'v')).toBe('h12')
    expect(secondHole('tn8', 'led', 'v')).toBe('a8')
    expect(secondHole('bn8', 'res', 'v')).toBeNull()
  })

  it('refuses taken holes, missing rail holes and the board edge', () => {
    const parts: SandboxPart[] = [{ id: 'r', kind: 'res', a: 'c12', b: 'c16', ohms: 330 }]
    const taken = occupied(parts)
    expect(canPlace('c16', 'c17', taken)).toBe(false)
    expect(canPlace('c17', 'c18', taken)).toBe(true)
    expect(canPlace('tp7', 'tp8', taken)).toBe(false)
    expect(canPlace('c62', secondHole('c62', 'res', 'h'), taken)).toBe(false)
    expect(canPlace('c16', 'c17', occupied(parts, 'r'))).toBe(true)
  })

  it('snaps a point to the nearest real hole', () => {
    const p = holeXY('g30')
    expect(nearestHole({ x: p.x + 4, y: p.y - 5 })).toBe('g30')
    expect(nearestHole({ x: 5, y: 5 })).toBeNull()
  })

  it('colours wires by the rail they touch', () => {
    expect(wireColorFor('tp5', 'a5')).toBe('#dc2626')
    expect(wireColorFor('e9', 'bn9')).toBe('#1c1c1f')
    expect(wireColorFor('a5', 'a9')).toBe('#2563eb')
  })
})

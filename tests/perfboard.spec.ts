import { describe, expect, it } from 'vitest'
import { perfLayout } from '../src/circuits/parking-flicker/perfboard'
import { checkNetlist, expandPath, perfNetlist, verifyPerfboard } from '../src/lib/perfboard/grid'
import type { PerfLayout } from '../src/types/circuit'

export const SCHEMATIC: Record<string, string[]> = {
  D1: ['IN', 'V12'],
  D2: ['GND', 'V12'],
  C1: ['V12', 'GND'],
  C2: ['V12', 'GND'],
  U2: ['V12', 'GND', 'V5'],
  C3: ['V5', 'GND'],
  C7: ['V5', 'GND'],
  U1: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'GND', 'nc8', 'GND', 'nc10', 'GND', 'nc12', 'GND', 'V5'],
  R1: ['P1', 'P2'],
  R2: ['P3', 'P4'],
  R3: ['P5', 'P6'],
  C4: ['P1', 'GND'],
  C5: ['P3', 'GND'],
  C6: ['P5', 'GND'],
  R4: ['P2', 'N'],
  R5: ['P4', 'N'],
  R6: ['P6', 'N'],
  R7: ['V5', 'N'],
  C8: ['N', 'GND'],
  Q1: ['N', 'C', 'E'],
  R8: ['E', 'GND'],
  R9: ['E', 'GND'],
  R10: ['E', 'GND'],
  R11: ['E', 'GND'],
  RED: ['IN'],
  BLACK: ['GND'],
  YELLOW: ['V12'],
  BLUE: ['C']
}

const upTo = (s: number): PerfLayout => ({
  ...perfLayout,
  parts: perfLayout.parts.filter(p => p.s <= s),
  traces: perfLayout.traces.filter(t => t.s <= s)
})

describe('perfboard layout', () => {
  it('wires every part leg to the schematic net', () => {
    const actual = Object.fromEntries(perfLayout.parts.map(p => [p.id, p.nets]))
    expect(actual).toEqual(SCHEMATIC)
  })

  it('has no clashes, shorts, splits or holes off the board', () => {
    expect(verifyPerfboard(perfLayout)).toEqual([])
  })

  it('never shorts two nets at any build stage', () => {
    const stages = [...new Set(perfLayout.parts.map(p => p.s))]
    stages.forEach(s => {
      const problems = verifyPerfboard(upTo(s)).filter(p => p.kind !== 'split')
      expect(problems, 'stage ' + s).toEqual([])
    })
  })

  it('lets the power stage alone deliver 5V and ground to the socket', () => {
    const power = upTo(3)
    const net = perfNetlist(power)
    expect(net.holes.get('12,6')).toBe('V5')
    expect(net.holes.get('18,9')).toBe('GND')
    const splits = checkNetlist(net, power.cols, power.rows).filter(p => p.kind === 'split')
    expect(splits.map(p => p.msg).filter(m => /^(V5|GND|V12) /.test(m))).toEqual([])
  })

  it('gives each part distinct holes', () => {
    const used = perfLayout.parts.flatMap(p => p.legs.map(h => h.join(',')))
    expect(new Set(used).size).toBe(used.length)
  })

  it('rejects a diagonal trace', () => {
    expect(() => expandPath([[0, 0], [1, 1]])).toThrow(/diagonal/)
  })

  it('reports a clash when a trace bridges two nets', () => {
    const broken: PerfLayout = { ...perfLayout, traces: [...perfLayout.traces, { net: 'N', s: 6, pts: [[20, 17], [20, 18]] }] }
    expect(verifyPerfboard(broken).some(p => p.kind === 'clash')).toBe(true)
  })
})


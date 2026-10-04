import { describe, expect, it } from 'vitest'
import { miniBoard } from '../src/circuits/parking-flicker/mini-board'
import { veroLayout } from '../src/circuits/parking-flicker/vero'
import { stripNetlist, verifyStripLayout } from '../src/lib/perfboard/strips'
import type { PerfLayout } from '../src/types/circuit'
import { SCHEMATIC } from './perfboard.spec'

const PAD_NETS: Record<string, string[]> = {
  'ADP+': ['IN'], 'ADP-': ['GND'], 'LAMP+': ['V12'], 'LAMP-': ['C'],
  RED: ['IN'], BLACK: ['GND'], YELLOW: ['V12'], BLUE: ['C']
}

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({ ...layout, parts: layout.parts.filter(p => p.s <= s) })

describe.each([
  ['vero 3x7', veroLayout],
  ['mini breadboard 170', miniBoard.layout]
])('%s layout', (_, layout) => {
  it('wires every part to its schematic net', () => {
    const unpolarized = new Set(['ceramic', 'res', 'resUp'])
    layout.parts.filter(p => p.k !== 'wire').forEach(p => {
      const expected = SCHEMATIC[p.id] ?? PAD_NETS[p.id]
      if (unpolarized.has(p.k)) expect([...p.nets].sort(), p.id).toEqual([...expected].sort())
      else expect(p.nets, p.id).toEqual(expected)
    })
  })

  it('includes every schematic part except the spare emitter spots', () => {
    const ids = new Set(layout.parts.map(p => p.id))
    const missing = Object.keys(SCHEMATIC).filter(id => !ids.has(id) && !['R10', 'R11'].includes(id) && !PAD_NETS[id])
    expect(missing).toEqual([])
  })

  it('has no shared holes, shorts or broken nets', () => {
    expect(verifyStripLayout(layout)).toEqual([])
  })

  it('never shorts two nets at any stage', () => {
    const stages = [...new Set(layout.parts.map(p => p.s))]
    stages.forEach(s => {
      expect(verifyStripLayout(upTo(layout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([])
    })
  })
})

describe('strip checks catch mistakes', () => {
  it('reports a short when a cut is missing', () => {
    const broken = { ...veroLayout, strips: { axis: 'rows' as const, cuts: veroLayout.strips!.cuts.slice(1) } }
    expect(verifyStripLayout(broken).some(p => p.kind === 'short')).toBe(true)
  })

  it('reports two legs in one hole', () => {
    const [first] = veroLayout.parts
    const broken = { ...veroLayout, parts: [...veroLayout.parts, { ...first, id: 'X', legs: [first.legs[0]], nets: [first.nets[0]] }] }
    expect(verifyStripLayout(broken).some(p => p.kind === 'clash')).toBe(true)
  })

  it('keeps the two breadboard halves apart', () => {
    const net = stripNetlist(miniBoard.layout)
    expect(net.holes.get('5,4')).toBe('V5')
    expect(net.holes.get('5,5')).toBe('P1')
  })

  it('fits a 3x7 cm board', () => {
    expect(veroLayout.cols * 2.54).toBeLessThanOrEqual(70)
    expect(veroLayout.rows * 2.54).toBeLessThanOrEqual(30)
  })
})

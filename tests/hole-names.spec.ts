import { describe, expect, it } from 'vitest'
import { assembly as angelAssembly } from '../src/circuits/angel-eye/assembly'
import { assembly } from '../src/circuits/parking-flicker/assembly'
import { holeName, holeText } from '../src/lib/perfboard/draw'
import { expandPath } from '../src/lib/perfboard/grid'
import type { AssemblyBoard } from '../src/types/circuit'

const PART_IDS = /^(R\d+|C\d|D\d|Q\d|U\d|L\d|P\d|W\d|T10)$/
const TAG = /⟦([A-Z]{1,2}\d{1,2})⟧/g
const PLAIN = /(?<![A-Za-z0-9⟦])([A-Z]{1,2}\d{1,2})(?![A-Za-z0-9Ωµ⟧])/g

function usedNames(board: AssemblyBoard): Set<string> {
  const { layout } = board
  const names = new Set<string>()
  layout.parts.forEach(p => p.legs.forEach(h => names.add(holeName(layout, h))))
  layout.traces.forEach(t => expandPath(t.pts).forEach(h => names.add(holeName(layout, h))))
  layout.strips?.cuts.forEach(c => {
    const at = Math.floor(c.at)
    const near = Number.isInteger(c.at) ? [at - 1, at, at + 1] : [at, at + 1]
    near.forEach(pos => names.add(holeName(layout, layout.strips!.axis === 'rows' ? [pos, c.strip] : [c.strip, pos])))
  })
  names.add('A1')
  return names
}

const texts = (board: AssemblyBoard) =>
  [board.note, ...board.phases.flatMap(p => [p.b, p.x, p.m, ...p.c]), ...board.layout.parts.map(p => p.tip)]

describe.each([...assembly.boards, ...angelAssembly.boards].map(b => [b.label, b] as const))('hole names in %s', (_, board) => {
  const used = usedNames(board)

  it('tags only holes the layout actually uses', () => {
    const tagged = texts(board).flatMap(t => [...t.matchAll(TAG)].map(m => m[1]))
    expect(tagged.length).toBeGreaterThan(0)
    expect(tagged.filter(tok => !used.has(tok))).toEqual([])
  })

  it('leaves no used hole name untagged unless it is a part name', () => {
    const plain = texts(board).flatMap(t => [...t.matchAll(PLAIN)].map(m => m[1]))
    expect(plain.filter(tok => used.has(tok) && !PART_IDS.test(tok))).toEqual([])
  })

  it('tags every column named by letter', () => {
    const untagged = texts(board).flatMap(t => [...t.matchAll(/العمود ([A-Z]{1,2})(?![A-Za-z0-9])/g)].map(m => m[0]))
    expect(untagged).toEqual([])
  })

  it('renders every tag for both letter directions', () => {
    texts(board).forEach(t => {
      expect(holeText(t, board.layout, 'left')).not.toMatch(/⟦|⟧/)
      expect(holeText(t, board.layout, 'right')).not.toMatch(/⟦|⟧/)
    })
  })
})

describe('letter direction', () => {
  const vero = assembly.boards.find(b => b.id === 'vero37')!.layout
  const perf = assembly.boards.find(b => b.id === 'perf')!.layout

  it('names columns with letters and rows with numbers', () => {
    expect(holeName(vero, [6, 2])).toBe('G3')
  })

  it('counts letters from the right when asked', () => {
    expect(holeName(vero, [6, 2], 'right')).toBe('R3')
    expect(holeText('رجل 1 في ⟦G3⟧ وركن ⟦A1⟧', vero, 'right')).toBe('رجل 1 في R3 وركن X1')
    expect(holeText('العمود ⟦H⟧ لحد ⟦J⟧', vero, 'right')).toBe('العمود Q لحد O')
  })

  it('keeps two-letter columns working on the wide board', () => {
    expect(holeName(perf, [29, 0])).toBe('AD1')
    expect(holeName(perf, [29, 0], 'right')).toBe('A1')
    expect(holeText('⟦AD1⟧', perf, 'right')).toBe('A1')
    expect(holeText('⟦A1⟧', perf, 'right')).toBe('AD1')
  })
})

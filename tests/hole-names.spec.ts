import { describe, expect, it } from 'vitest'
import { assembly } from '../src/circuits/parking-flicker/assembly'
import { holeName } from '../src/lib/perfboard/draw'
import { expandPath } from '../src/lib/perfboard/grid'
import type { AssemblyBoard } from '../src/types/circuit'

const PART_IDS = /^(R\d+|C\d|D\d|Q\d|U\d|L\d|P\d|W\d|T10)$/
const TOKEN = /(?<![A-Za-z0-9])([A-Z]{1,2}\d{1,2})(?![A-Za-z0-9Ωµ])/g

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

function mentioned(board: AssemblyBoard): string[] {
  const texts = [board.note, ...board.phases.flatMap(p => [p.b, p.x, p.m, ...p.c]), ...board.layout.parts.map(p => p.tip)]
  return texts.flatMap(t => [...t.matchAll(TOKEN)].map(m => m[1])).filter(tok => !PART_IDS.test(tok))
}

describe.each(assembly.boards.map(b => [b.label, b] as const))('hole names in %s', (_, board) => {
  it('only names holes the layout actually uses', () => {
    const used = usedNames(board)
    expect(mentioned(board).filter(tok => !used.has(tok))).toEqual([])
  })

  it('names columns with letters and rows with numbers', () => {
    expect(holeName(board.layout, [6, 2])).toBe('G3')
  })
})

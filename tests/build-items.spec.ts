import { describe, expect, it } from 'vitest'
import { assembly } from '../src/circuits/parking-flicker/assembly'
import { buildItems, hiddenAfter, sideFor, type BuildItem } from '../src/lib/perfboard/build-items'

const key = (it: BuildItem) => it.kind + ':' + (it.kind === 'part' ? it.id : it.index)

describe.each(assembly.boards.map(b => [b.label, b] as const))('build steps for %s', (_, board) => {
  const first = Math.min(...board.phases.map(p => p.s))
  const all = board.phases.flatMap(p => buildItems(board.layout, p.s, first))

  it('walks every part, trail and cut exactly once', () => {
    const expected = [
      ...board.layout.parts.map(p => 'part:' + p.id),
      ...board.layout.traces.map((_, i) => 'trace:' + i),
      ...(board.layout.strips?.cuts ?? []).map((_, i) => 'cut:' + i)
    ].sort()
    expect(all.map(key).sort()).toEqual(expected)
  })

  it('cuts copper before anything is installed', () => {
    const firstPart = all.findIndex(it => it.kind === 'part')
    const lastCut = all.map(it => it.kind).lastIndexOf('cut')
    if (lastCut >= 0) expect(lastCut).toBeLessThan(firstPart)
  })
})

describe('build step helpers', () => {
  const items: BuildItem[] = [{ kind: 'cut', index: 0 }, { kind: 'part', id: 'R1' }, { kind: 'trace', index: 3 }]

  it('hides only the items after the current one', () => {
    const hidden = hiddenAfter(items, 1)
    expect([...hidden.parts]).toEqual([])
    expect([...hidden.traces]).toEqual([3])
    expect([...hidden.cuts]).toEqual([])
  })

  it('flips to the solder side for trails and cuts', () => {
    expect(items.map(sideFor)).toEqual(['bottom', 'top', 'bottom'])
    expect(sideFor(undefined)).toBe('top')
  })
})

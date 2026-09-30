import { describe, expect, it } from 'vitest'
import { circuits } from '../src/circuits'
import { verifyLayout } from '../src/lib/breadboard/verify'
import { focusFor, stripNetMap, visibleParts } from '../src/lib/breadboard/logic'
import { holeXY, parseHole, stripBox, stripOf } from '../src/lib/breadboard/geometry'

const UNCONNECTED = ['NC']

describe.each(circuits.filter(c => c.board).map(c => [c.id, c] as const))('breadboard layout of %s', (_id, circuit) => {
  const board = circuit.board!
  const stages = [...new Set(board.parts.map(p => p.s))].sort()

  it('has no shorts, reused holes, missing rail holes or split nets when complete', () => {
    const report = verifyLayout(board.parts, board.railNets, UNCONNECTED)
    expect(report.errors).toEqual([])
  })

  it.each(stages)('stays electrically consistent when built up to stage %i', stage => {
    const report = verifyLayout(board.parts.filter(p => p.s <= stage), board.railNets, UNCONNECTED)
    expect(report.errors).toEqual([])
  })

  it('names a known net for every pin and chip', () => {
    const known = new Set(Object.keys(board.nets))
    const pinNets = board.parts.flatMap(p => p.pins.map(x => x[1]))
    expect(pinNets.filter(n => !known.has(n))).toEqual([])
    expect(board.netChips.filter(n => !known.has(n))).toEqual([])
  })

  it('has beginner text and alternatives for every part', () => {
    const keys = board.parts.map(p => board.eduOf[p.id] ?? board.eduFallback)
    expect(keys.filter(k => !board.edu[k])).toEqual([])
    expect(keys.filter(k => !board.alternatives[k]?.length)).toEqual([])
  })

  it('links every stage to a real build step', () => {
    const count = circuit.steps?.items.length ?? 0
    expect(board.stages.filter(s => s.step !== undefined && s.step >= count)).toEqual([])
  })
})

describe('breadboard geometry', () => {
  it('parses holes and rails', () => {
    expect(parseHole('g26')).toEqual({ row: 'g', col: 26 })
    expect(parseHole('tp20')).toEqual({ row: 'tp', col: 20 })
    expect(parseHole('z1')).toBeNull()
  })

  it('groups holes into the strips a real board connects', () => {
    expect(stripOf('a5')).toBe(stripOf('e5'))
    expect(stripOf('e5')).not.toBe(stripOf('f5'))
    expect(stripOf('bn2')).toBe(stripOf('bn60'))
  })

  it('treats single-digit column strips as columns, not rails', () => {
    expect(stripBox('T1').h).toBeGreaterThan(16)
    expect(Number.isNaN(stripBox('B9').y)).toBe(false)
  })

  it('throws on an unknown hole instead of drawing at NaN', () => {
    expect(() => holeXY('x9')).toThrow()
  })
})

describe('board selection logic', () => {
  const board = circuits[0].board!
  const all = visibleParts(board.parts, 0, 't10', new Set())

  it('hides parts from later stages and the other lamp mode', () => {
    const stage2 = visibleParts(board.parts, 2, 't10', new Set())
    expect(stage2.every(p => p.s <= 2)).toBe(true)
    expect(all.some(p => p.mode === 'led')).toBe(false)
  })

  it('highlights every strip of a net and focuses only parts on it', () => {
    const strips = stripNetMap(all)
    const { focus, highlights } = focusFor({ kind: 'net', net: 'N' }, board.parts, all, strips)
    expect(highlights.map(h => h.strip).sort()).toEqual(['B46', 'T50'])
    expect(focus?.has('Q1')).toBe(true)
    expect(focus?.has('D1')).toBe(false)
  })

  it('focuses a part together with its direct neighbours', () => {
    const { focus } = focusFor({ kind: 'part', id: 'R4' }, board.parts, all, stripNetMap(all))
    expect([...(focus ?? [])]).toEqual(expect.arrayContaining(['R4', 'JA', 'R5', 'R6', 'C8', 'JN']))
  })
})

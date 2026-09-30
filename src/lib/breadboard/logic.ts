import type { BoardPart } from '../../types/circuit'
import { isRail, stripOf } from './geometry'

export type Selection =
  | { kind: 'part'; id: string }
  | { kind: 'net'; net: string }
  | { kind: 'strip'; strip: string }
  | null

export interface Highlight {
  strip: string
  net: string
}

export interface Focus {
  focus: Set<string> | null
  highlights: Highlight[]
}

export function visibleParts(parts: BoardPart[], stage: number, lampMode: string, hidden: Set<string>): BoardPart[] {
  return parts.filter(p => (!p.mode || p.mode === lampMode) && !hidden.has(p.id) && (stage === 0 || p.s <= stage))
}

export function stripNetMap(parts: BoardPart[]): Record<string, string> {
  return Object.fromEntries(parts.flatMap(p => p.pins.map(([h, n]) => [stripOf(h), n])))
}

export const touchesNet = (p: BoardPart, net: string): boolean =>
  p.pins.some(x => x[1] === net) || (p.nets ?? []).includes(net)

function partFocus(part: BoardPart, vis: BoardPart[]): Focus {
  const own = new Set(part.pins.map(x => stripOf(x[0])).filter(s => !isRail(s)))
  const neighbours = vis.filter(q => q.pins.some(x => own.has(stripOf(x[0])))).map(q => q.id)
  return {
    focus: new Set([part.id, ...(part.link ?? []), ...neighbours]),
    highlights: part.pins.map(([h, net]) => ({ strip: stripOf(h), net }))
  }
}

export function focusFor(sel: Selection, all: BoardPart[], vis: BoardPart[], strips: Record<string, string>): Focus {
  if (!sel) return { focus: null, highlights: [] }
  if (sel.kind === 'part') {
    const part = all.find(p => p.id === sel.id)
    return part ? partFocus(part, vis) : { focus: null, highlights: [] }
  }
  if (sel.kind === 'net') {
    return {
      focus: new Set(vis.filter(q => touchesNet(q, sel.net)).map(q => q.id)),
      highlights: Object.keys(strips).filter(s => strips[s] === sel.net).map(strip => ({ strip, net: sel.net }))
    }
  }
  return { focus: new Set(), highlights: [{ strip: sel.strip, net: '' }] }
}

export function pinsOnNet(p: BoardPart, net: string): string {
  const name = p.lab ?? p.id
  const idx = p.pins.map((x, i) => (x[1] === net ? i : -1)).filter(i => i >= 0)
  return p.pn && idx.length ? idx.map(i => `${name} ${p.pn?.[i]}`).join('، ') : name
}

import type { BoardPart } from '../../types/circuit'
import { COLS, hasRailHole, parseHole, stripOf } from './geometry'

export interface LayoutReport {
  errors: string[]
  holes: number
  nets: number
}

function collectStripNets(parts: BoardPart[], railNets: Record<string, string>, errors: string[]): Map<string, Set<string>> {
  const used = new Map<string, string>()
  const stripNets = new Map<string, Set<string>>()
  const add = (strip: string, net: string) => stripNets.set(strip, new Set([...(stripNets.get(strip) ?? []), net]))
  for (const p of parts) {
    for (const [h, net] of p.pins) {
      const q = parseHole(h)
      if (!q) { errors.push(`${p.id}: bad hole ${h}`); continue }
      if (q.col < 1 || q.col > COLS) errors.push(`${p.id}: column out of range ${h}`)
      if (q.row.length === 2 && !hasRailHole(q.col)) errors.push(`${p.id}: no rail hole at ${h}`)
      const owner = used.get(h)
      if (owner) errors.push(`hole ${h} used by ${owner} and ${p.id}`)
      used.set(h, p.id)
      add(stripOf(h), net)
    }
  }
  Object.entries(railNets).forEach(([r, n]) => add(r, n))
  for (const [s, set] of stripNets) if (set.size > 1) errors.push(`short on ${s}: ${[...set].join(', ')}`)
  return stripNets
}

function linksByNet(parts: BoardPart[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const p of parts) {
    p.pins.forEach(([ha, na], i) => p.pins.forEach(([hb, nb], j) => {
      if (i === j || na !== nb) return
      const a = stripOf(ha)
      adj.set(a, new Set([...(adj.get(a) ?? []), stripOf(hb)]))
    }))
  }
  return adj
}

function reachable(start: string, adj: Map<string, Set<string>>): Set<string> {
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) {
    const x = stack.pop() as string
    for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y) }
  }
  return seen
}

export function verifyLayout(parts: BoardPart[], railNets: Record<string, string>, unconnectedNets: string[] = []): LayoutReport {
  const errors: string[] = []
  const stripNets = collectStripNets(parts, railNets, errors)
  const netStrips = new Map<string, string[]>()
  for (const [s, set] of stripNets) {
    const n = [...set][0]
    netStrips.set(n, [...(netStrips.get(n) ?? []), s])
  }
  const adj = linksByNet(parts)
  for (const [n, strips] of netStrips) {
    if (unconnectedNets.includes(n)) continue
    const seen = reachable(strips[0], adj)
    const missing = strips.filter(s => !seen.has(s))
    if (missing.length) errors.push(`net ${n} is split: ${missing.join(', ')} not reached from ${strips[0]}`)
  }
  const holes = parts.reduce((sum, p) => sum + p.pins.length, 0)
  return { errors, holes, nets: netStrips.size }
}

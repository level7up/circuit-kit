import type { Point } from '../../types/circuit'
import { COLS, PITCH, ROWS, X0, hasRailHole, parseHole } from '../breadboard/geometry'
import type { SandboxKind, SandboxPart } from './solver'

export type Orientation = 'h' | 'v'

export const ROW_ORDER = ['tp', 'tn', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'bn', 'bp']

export type PlaceableKind = Exclude<SandboxKind, 'wire'>

export const SPAN: Record<PlaceableKind, number> = { res: 4, led: 1, switch: 2, button: 2, diode: 4, buzzer: 2, bulb: 3, motor: 3, ldr: 2, pot: 2, npn: 2 }
export const THREE_LEGGED: PlaceableKind[] = ['pot', 'npn']

export interface Legs {
  a: string
  b: string
  c?: string
}

const isRailRow = (row: string) => row.length === 2

export function holeExists(h: string): boolean {
  const q = parseHole(h)
  if (!q || q.col < 1 || q.col > COLS) return false
  return isRailRow(q.row) ? hasRailHole(q.col) : true
}

function offsetHole(anchor: string, steps: number, orient: Orientation): string | null {
  const q = parseHole(anchor)
  if (!q) return null
  if (orient === 'h') return q.row + (q.col + steps)
  const row = ROW_ORDER[ROW_ORDER.indexOf(q.row) + steps]
  return row ? row + q.col : null
}

export function secondHole(anchor: string, kind: PlaceableKind, orient: Orientation): string | null {
  return offsetHole(anchor, SPAN[kind], orient)
}

export function legsFor(anchor: string, kind: PlaceableKind, orient: Orientation): Legs | null {
  const b = secondHole(anchor, kind, orient)
  if (!b) return null
  if (!THREE_LEGGED.includes(kind)) return { a: anchor, b }
  const c = offsetHole(anchor, 1, orient)
  return c ? { a: anchor, b, c } : null
}

export function occupied(parts: SandboxPart[], ignoreId?: string): Set<string> {
  return new Set(parts.filter(p => p.id !== ignoreId).flatMap(p => [p.a, p.b, ...(p.c ? [p.c] : [])]))
}

export function canPlace(a: string, b: string | null, taken: Set<string>): b is string {
  return !!b && a !== b && holeExists(a) && holeExists(b) && !taken.has(a) && !taken.has(b)
}

export function canPlaceLegs(legs: Legs | null, taken: Set<string>): legs is Legs {
  if (!legs || !canPlace(legs.a, legs.b, taken)) return false
  return !legs.c || (holeExists(legs.c) && !taken.has(legs.c))
}

export function nearestHole(p: Point): string | null {
  const col = Math.round((p.x - X0) / PITCH) + 1
  if (col < 1 || col > COLS) return null
  const row = ROW_ORDER.reduce((best, r) => (Math.abs(ROWS[r] - p.y) < Math.abs(ROWS[best] - p.y) ? r : best), ROW_ORDER[0])
  if (Math.abs(ROWS[row] - p.y) > PITCH) return null
  const hole = row + col
  return holeExists(hole) ? hole : null
}

export function orientationOf(part: SandboxPart): Orientation {
  const a = parseHole(part.a)
  const b = parseHole(part.b)
  return a && b && a.row === b.row ? 'h' : 'v'
}

export function wireColorFor(a: string, b: string): string {
  const rails = [a, b].map(h => parseHole(h)?.row ?? '')
  if (rails.some(r => r === 'tp' || r === 'bp')) return '#dc2626'
  if (rails.some(r => r === 'tn' || r === 'bn')) return '#1c1c1f'
  return '#2563eb'
}

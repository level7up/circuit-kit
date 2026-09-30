import type { Point } from '../../types/circuit'

export const PITCH = 18
export const X0 = 150
export const COLS = 63
export const ROWS: Record<string, number> = {
  tp: 130, tn: 148, a: 178, b: 196, c: 214, d: 232, e: 250,
  f: 304, g: 322, h: 340, i: 358, j: 376, bn: 406, bp: 424
}
export const RAILS = ['tp', 'tn', 'bn', 'bp'] as const
export const BOARD_EDGE = { left: 130, top: 110, bottom: 444 }

export const colX = (c: number): number => X0 + (c - 1) * PITCH
export const boardRight = (): number => colX(COLS) + 20
export const hasRailHole = (c: number): boolean => c >= 2 && c <= 62 && (c - 2) % 6 !== 5
export const isRail = (strip: string): boolean => (RAILS as readonly string[]).includes(strip)

export interface Hole {
  row: string
  col: number
}

export function parseHole(h: string): Hole | null {
  const m = /^(tp|tn|bn|bp|[a-j])(\d+)$/.exec(h)
  return m ? { row: m[1], col: +m[2] } : null
}

export function holeXY(h: string | Point): Point {
  if (typeof h !== 'string') return h
  const q = parseHole(h)
  if (!q) throw new Error('Unknown breadboard hole: ' + h)
  return { x: colX(q.col), y: ROWS[q.row] }
}

export function stripOf(h: string): string {
  const q = parseHole(h)
  if (!q) throw new Error('Unknown breadboard hole: ' + h)
  if (q.row.length === 2) return q.row
  return ('abcde'.includes(q.row) ? 'T' : 'B') + q.col
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function stripBox(s: string): Box {
  if (isRail(s)) return { x: colX(2) - 8, y: ROWS[s] - 8, w: colX(62) - colX(2) + 16, h: 16 }
  const c = +s.slice(1)
  const top = s[0] === 'T'
  return { x: colX(c) - 8, y: (top ? ROWS.a : ROWS.f) - 8, w: 16, h: (top ? ROWS.e - ROWS.a : ROWS.j - ROWS.f) + 16 }
}

export function allStrips(): string[] {
  const ids: string[] = [...RAILS]
  for (let c = 1; c <= COLS; c++) ids.push('T' + c, 'B' + c)
  return ids
}

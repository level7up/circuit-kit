export const STEPS = 10

export type BusId = 'BA' | 'BB' | 'BC' | 'BD' | 'BE'

export const BUS_STEPS: Record<BusId, number[]> = {
  BA: [0, 1, 2, 3],
  BB: [5, 6, 7, 8],
  BC: [0, 2],
  BD: [5, 7],
  BE: [2, 3, 4, 5]
}

export const BUS_LETTER: Record<BusId, string> = { BA: 'A', BB: 'B', BC: 'C', BD: 'D', BE: 'E' }

export const ALTERNATE = 0
export const SYNC = 1
export const DOUBLE = 2
export const SWEEP = 3
export const BETWEEN = 4

export interface Pattern {
  id: number
  icon: string
  name: string
  left: BusId
  right: BusId
}

export const PATTERNS: Pattern[] = [
  { id: ALTERNATE, icon: '↔️', name: 'تبادل يمين وشمال', left: 'BA', right: 'BB' },
  { id: SYNC, icon: '💥', name: 'الاتنين مع بعض', left: 'BA', right: 'BA' },
  { id: DOUBLE, icon: '⚡', name: 'دبل فلاش', left: 'BC', right: 'BD' },
  { id: SWEEP, icon: '🌊', name: 'شمال ← الاتنين ← يمين', left: 'BA', right: 'BE' }
]

export interface Outputs {
  left: boolean
  right: boolean
}

export const busHigh = (bus: BusId, step: number): boolean => BUS_STEPS[bus].includes(step)

export function outputs(pattern: number, step: number): Outputs {
  const p = PATTERNS[pattern]
  if (!p) return { left: false, right: false }
  return { left: busHigh(p.left, step), right: busHigh(p.right, step) }
}

export const outputsOf = (bus: BusId): string[] => BUS_STEPS[bus].map(n => 'Q' + n)

export const stateRow = (pattern: number): string =>
  Array.from({ length: STEPS }, (_, n) => {
    const o = outputs(pattern, n)
    return o.left && o.right ? 'ش+ي' : o.left ? 'ش' : o.right ? 'ي' : '—'
  }).join(' · ')

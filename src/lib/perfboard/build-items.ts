import type { PerfLayout } from '../../types/circuit'

export type BuildItem =
  | { kind: 'cut'; index: number }
  | { kind: 'part'; id: string }
  | { kind: 'trace'; index: number }

export interface HiddenItems {
  parts: Set<string>
  traces: Set<number>
  cuts: Set<number>
}

export function buildItems(layout: PerfLayout, stage: number, firstStage: number): BuildItem[] {
  const cuts: BuildItem[] = stage === firstStage && layout.strips
    ? layout.strips.cuts.map((_, index) => ({ kind: 'cut', index }))
    : []
  const parts: BuildItem[] = layout.parts.filter(p => p.s === stage).map(p => ({ kind: 'part', id: p.id }))
  const traces: BuildItem[] = layout.traces
    .map((t, index) => ({ s: t.s, index }))
    .filter(t => t.s === stage)
    .map(t => ({ kind: 'trace', index: t.index }))
  return [...cuts, ...parts, ...traces]
}

export function hiddenAfter(items: BuildItem[], current: number): HiddenItems {
  const later = items.slice(current + 1)
  return {
    parts: new Set(later.flatMap(i => (i.kind === 'part' ? [i.id] : []))),
    traces: new Set(later.flatMap(i => (i.kind === 'trace' ? [i.index] : []))),
    cuts: new Set(later.flatMap(i => (i.kind === 'cut' ? [i.index] : [])))
  }
}

export const sideFor = (item: BuildItem | undefined): 'top' | 'bottom' =>
  item && item.kind !== 'part' ? 'bottom' : 'top'

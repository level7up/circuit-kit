import type { Hole, PerfLayout } from '../../types/circuit'
import { checkNetlist, expandPath, holeKey, type Connection, type Problem } from './grid'

export type StripAxis = 'rows' | 'cols'

export interface StripCut {
  strip: number
  at: number
  drill: boolean
}

export interface StripLink {
  net: string
  s: number
  a: Hole
  b: Hole
}

export interface StripPlan {
  axis: StripAxis
  used: Map<string, string>
  cuts: StripCut[]
  links: StripLink[]
}

const along = (axis: StripAxis, [x, y]: Hole): number => (axis === 'rows' ? x : y)
const stripOf = (axis: StripAxis, [x, y]: Hole): number => (axis === 'rows' ? y : x)
const holeAt = (axis: StripAxis, strip: number, pos: number): Hole => (axis === 'rows' ? [pos, strip] : [strip, pos])
const parseHole = (k: string): Hole => k.split(',').map(Number) as Hole

function segments(path: Hole[]): Hole[][] {
  const out: Hole[][] = []
  let current: Hole[] = [path[0]]
  path.slice(1).forEach(h => {
    const vertical = (a: Hole, b: Hole) => a[0] === b[0]
    if (current.length < 2 || vertical(current[0], current[1]) === vertical(current[current.length - 1], h)) {
      current = [...current, h]
      return
    }
    out.push(current)
    current = [current[current.length - 1], h]
  })
  return [...out, current]
}

const runsAlongStrip = (axis: StripAxis, seg: Hole[]): boolean =>
  stripOf(axis, seg[0]) === stripOf(axis, seg[seg.length - 1])

function usedHoles(layout: PerfLayout): Map<string, string> {
  const used = new Map<string, string>()
  layout.parts.forEach(p => p.legs.forEach((h, i) => used.set(holeKey(h), p.nets[i])))
  layout.traces.forEach(t => segments(expandPath(t.pts)).forEach(seg => {
    used.set(holeKey(seg[0]), t.net)
    used.set(holeKey(seg[seg.length - 1]), t.net)
  }))
  return used
}

function linksOf(layout: PerfLayout, axis: StripAxis, used: Map<string, string>): StripLink[] {
  return layout.traces.flatMap(t => segments(expandPath(t.pts))
    .filter(seg => !runsAlongStrip(axis, seg))
    .flatMap(seg => {
      const stops = seg.filter(h => used.has(holeKey(h)))
      return stops.slice(1).map((b, i) => ({ net: t.net, s: t.s, a: stops[i], b }))
    }))
}

function positionsByStrip(axis: StripAxis, used: Map<string, string>): Map<number, { pos: number; net: string }[]> {
  const byStrip = new Map<number, { pos: number; net: string }[]>()
  used.forEach((net, k) => {
    const h = parseHole(k)
    const s = stripOf(axis, h)
    byStrip.set(s, [...(byStrip.get(s) ?? []), { pos: along(axis, h), net }])
  })
  byStrip.forEach((list, s) => byStrip.set(s, [...list].sort((a, b) => a.pos - b.pos)))
  return byStrip
}

function cutsOf(axis: StripAxis, used: Map<string, string>): StripCut[] {
  const cuts: StripCut[] = []
  positionsByStrip(axis, used).forEach((sorted, strip) => {
    sorted.slice(1).forEach((cur, i) => {
      const prev = sorted[i]
      if (prev.net === cur.net) return
      const gap = cur.pos - prev.pos
      cuts.push({ strip, at: gap > 1 ? prev.pos + Math.floor(gap / 2) : prev.pos + 0.5, drill: gap > 1 })
    })
  })
  return cuts
}

export function planStripboard(layout: PerfLayout, axis: StripAxis): StripPlan {
  const used = usedHoles(layout)
  return { axis, used, links: linksOf(layout, axis, used), cuts: cutsOf(axis, used) }
}

export function stripEdges(plan: StripPlan): Connection[] {
  const edges: Connection[] = plan.links.map(({ a, b }) => ({ a, b }))
  positionsByStrip(plan.axis, plan.used).forEach((sorted, strip) => {
    sorted.slice(1).forEach((cur, i) => {
      const prev = sorted[i]
      const isCut = plan.cuts.some(c => c.strip === strip && c.at > prev.pos && c.at < cur.pos)
      if (!isCut) edges.push({ a: holeAt(plan.axis, strip, prev.pos), b: holeAt(plan.axis, strip, cur.pos) })
    })
  })
  return edges
}

export function verifyStripboard(layout: PerfLayout, plan: StripPlan): Problem[] {
  return checkNetlist({ holes: plan.used, edges: stripEdges(plan) }, layout.cols, layout.rows)
}

export const stripEffort = (p: StripPlan): number =>
  p.cuts.length + p.cuts.filter(c => !c.drill).length + p.links.length

export function bestStripboard(layout: PerfLayout): StripPlan {
  const plans = (['cols', 'rows'] as StripAxis[]).map(axis => planStripboard(layout, axis))
  return plans.reduce((best, p) => (stripEffort(p) < stripEffort(best) ? p : best))
}

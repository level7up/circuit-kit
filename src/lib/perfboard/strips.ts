import type { Hole, PerfLayout, PerfTrace, StripSpec } from '../../types/circuit'
import { checkNetlist, holeKey, type Connection, type Netlist, type Problem } from './grid'

export function breadboardStrips(cols: number, channelAfter: number): StripSpec {
  return { axis: 'cols', cuts: Array.from({ length: cols }, (_, c) => ({ strip: c, at: channelAfter + 0.5 })) }
}

const stripOf = (spec: StripSpec, [x, y]: Hole): number => (spec.axis === 'rows' ? y : x)
const posOf = (spec: StripSpec, [x, y]: Hole): number => (spec.axis === 'rows' ? x : y)

export function stripNetlist(layout: PerfLayout, problems: Problem[] = []): Netlist {
  const spec = layout.strips
  if (!spec) throw new Error('layout has no strips')
  const holes = new Map<string, string>()
  const owner = new Map<string, string>()
  layout.parts.forEach(p => p.legs.forEach((h, i) => {
    const k = holeKey(h)
    const prev = owner.get(k)
    if (prev) problems.push({ kind: 'clash', msg: `${p.id} and ${prev} share hole ${k}` })
    owner.set(k, p.id)
    holes.set(k, p.nets[i])
  }))
  spec.cuts.filter(c => Number.isInteger(c.at)).forEach(c => {
    const k = holeKey(spec.axis === 'rows' ? [c.at, c.strip] : [c.strip, c.at])
    if (owner.has(k)) problems.push({ kind: 'clash', msg: `cut drilled through hole ${k} used by ${owner.get(k)}` })
  })
  const edges: Connection[] = layout.parts.filter(p => p.k === 'wire').map(w => ({ a: w.legs[0], b: w.legs[1] }))
  const byStrip = new Map<number, Hole[]>()
  holes.forEach((_, k) => {
    const h = k.split(',').map(Number) as Hole
    byStrip.set(stripOf(spec, h), [...(byStrip.get(stripOf(spec, h)) ?? []), h])
  })
  byStrip.forEach((list, strip) => {
    const sorted = [...list].sort((a, b) => posOf(spec, a) - posOf(spec, b))
    sorted.slice(1).forEach((h, i) => {
      const prev = sorted[i]
      const isCut = spec.cuts.some(c => c.strip === strip && c.at > posOf(spec, prev) && c.at < posOf(spec, h))
      if (!isCut) edges.push({ a: prev, b: h })
    })
  })
  return { holes, edges }
}

interface StripHole {
  h: Hole
  s: number
  net: string
}

function stripSegments(layout: PerfLayout, spec: StripSpec): StripHole[][] {
  const byStrip = new Map<number, StripHole[]>()
  layout.parts.forEach(p => p.legs.forEach((h, i) => {
    const strip = stripOf(spec, h)
    byStrip.set(strip, [...(byStrip.get(strip) ?? []), { h, s: p.s, net: p.nets[i] }])
  }))
  const segments: StripHole[][] = []
  byStrip.forEach((list, strip) => {
    const sorted = [...list].sort((a, b) => posOf(spec, a.h) - posOf(spec, b.h))
    let current: StripHole[] = []
    sorted.forEach((item, i) => {
      const prev = sorted[i - 1]
      const isCut = prev && spec.cuts.some(c => c.strip === strip && c.at > posOf(spec, prev.h) && c.at < posOf(spec, item.h))
      if (isCut) {
        segments.push(current)
        current = []
      }
      current = [...current, item]
    })
    segments.push(current)
  })
  return segments.filter(seg => seg.length > 1)
}

function growingRuns(seg: StripHole[], spec: StripSpec): PerfTrace[] {
  const stages = [...new Set(seg.map(x => x.s))].sort((a, b) => a - b)
  const runs: PerfTrace[] = []
  let span: [StripHole, StripHole] | null = null
  stages.forEach(stage => {
    const present = seg.filter(x => x.s <= stage)
    if (present.length < 2) return
    const lo = present[0]
    const hi = present[present.length - 1]
    if (!span) runs.push({ net: lo.net, s: stage, pts: [lo.h, hi.h] })
    else {
      if (posOf(spec, lo.h) < posOf(spec, span[0].h)) runs.push({ net: lo.net, s: stage, pts: [lo.h, span[0].h] })
      if (posOf(spec, hi.h) > posOf(spec, span[1].h)) runs.push({ net: hi.net, s: stage, pts: [span[1].h, hi.h] })
    }
    span = [lo, hi]
  })
  return runs
}

export function stripsToTraces(layout: PerfLayout): PerfTrace[] {
  const spec = layout.strips
  if (!spec) throw new Error('layout has no strips')
  return stripSegments(layout, spec).flatMap(seg => growingRuns(seg, spec))
}

export function verifyStripLayout(layout: PerfLayout): Problem[] {
  const problems: Problem[] = []
  const net = stripNetlist(layout, problems)
  return checkNetlist(net, layout.cols, layout.rows, problems)
}

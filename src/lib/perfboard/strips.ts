import type { Hole, PerfLayout, StripSpec } from '../../types/circuit'
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

export function verifyStripLayout(layout: PerfLayout): Problem[] {
  const problems: Problem[] = []
  const net = stripNetlist(layout, problems)
  return checkNetlist(net, layout.cols, layout.rows, problems)
}

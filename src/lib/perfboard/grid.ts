import type { Hole, PerfLayout, PerfTrace } from '../../types/circuit'

export const holeKey = ([x, y]: Hole): string => x + ',' + y

export function expandPath(pts: Hole[]): Hole[] {
  const out: Hole[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x0 !== x1 && y0 !== y1) throw new Error(`trace step ${x0},${y0} → ${x1},${y1} is diagonal`)
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let k = 1; k <= n; k++) out.push([x0 + Math.sign(x1 - x0) * k, y0 + Math.sign(y1 - y0) * k])
  }
  return out
}

export interface Connection {
  a: Hole
  b: Hole
}

export interface Netlist {
  holes: Map<string, string>
  edges: Connection[]
}

export interface Problem {
  kind: 'clash' | 'split' | 'short' | 'outside'
  msg: string
}

function claim(holes: Map<string, string>, h: Hole, net: string, problems: Problem[], who: string) {
  const k = holeKey(h)
  const prev = holes.get(k)
  if (prev && prev !== net) problems.push({ kind: 'clash', msg: `${who} puts ${net} on ${k} which already holds ${prev}` })
  else holes.set(k, net)
}

export function perfNetlist(layout: PerfLayout, problems: Problem[] = []): Netlist {
  const holes = new Map<string, string>()
  const edges: Connection[] = []
  layout.parts.forEach(p => p.legs.forEach((h, i) => claim(holes, h, p.nets[i], problems, p.id)))
  layout.traces.forEach((t: PerfTrace) => {
    const path = expandPath(t.pts)
    path.forEach(h => claim(holes, h, t.net, problems, 'trace ' + t.net))
    for (let i = 1; i < path.length; i++) edges.push({ a: path[i - 1], b: path[i] })
  })
  return { holes, edges }
}

function groups(net: Netlist): Map<string, string[]> {
  const parent = new Map<string, string>()
  const find = (k: string): string => {
    const p = parent.get(k) ?? k
    if (p === k) return k
    const root = find(p)
    parent.set(k, root)
    return root
  }
  net.holes.forEach((_, k) => parent.set(k, k))
  net.edges.forEach(({ a, b }) => {
    const ra = find(holeKey(a))
    const rb = find(holeKey(b))
    if (ra !== rb) parent.set(ra, rb)
  })
  const out = new Map<string, string[]>()
  net.holes.forEach((_, k) => out.set(find(k), [...(out.get(find(k)) ?? []), k]))
  return out
}

export function checkNetlist(net: Netlist, cols: number, rows: number, problems: Problem[] = []): Problem[] {
  net.holes.forEach((_, k) => {
    const [x, y] = k.split(',').map(Number)
    if (x < 0 || y < 0 || x >= cols || y >= rows) problems.push({ kind: 'outside', msg: `${k} is off the board` })
  })
  const seen = new Map<string, number>()
  groups(net).forEach(members => {
    const nets = new Set(members.map(k => net.holes.get(k)!))
    if (nets.size > 1) problems.push({ kind: 'short', msg: `${[...nets].join(' + ')} are joined` })
    nets.forEach(n => seen.set(n, (seen.get(n) ?? 0) + 1))
  })
  seen.forEach((count, n) => {
    if (count > 1) problems.push({ kind: 'split', msg: `${n} is in ${count} separate pieces` })
  })
  return problems
}

export function verifyPerfboard(layout: PerfLayout): Problem[] {
  const problems: Problem[] = []
  const net = perfNetlist(layout, problems)
  return checkNetlist(net, layout.cols, layout.rows, problems)
}

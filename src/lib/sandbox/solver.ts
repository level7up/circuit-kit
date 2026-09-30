import { stripOf } from '../breadboard/geometry'

export type SandboxKind = 'res' | 'led' | 'wire' | 'switch'

export interface SandboxPart {
  id: string
  kind: SandboxKind
  a: string
  b: string
  ohms?: number
  color?: LedColor
  closed?: boolean
  burned?: boolean
  burnCurrent?: number
}

export type LedColor = 'red' | 'yellow' | 'green' | 'blue' | 'white'

export const LED_VF: Record<LedColor, number> = { red: 1.8, yellow: 2, green: 2.1, blue: 3, white: 3 }
export const LED_MAX_A = 0.03
export const LED_FULL_A = 0.02
export const RESISTOR_RATED_W = 0.25

const LED_SERIES_OHMS = 15
const GMIN = 1e-9
const MAX_ITERATIONS = 40

export type LedState = 'on' | 'off' | 'reversed' | 'burned' | 'bypassed'

export interface PartResult {
  current: number
  voltage: number
  ledState?: LedState
  brightness?: number
  hot?: boolean
  bypassed?: boolean
}

export interface SolveResult {
  short: boolean
  nodeOf: (strip: string) => number
  voltage: (strip: string) => number | null
  parts: Record<string, PartResult>
  burnedNow: string[]
}

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    const p = this.parent.get(x) ?? x
    if (p === x) return x
    const root = this.find(p)
    this.parent.set(x, root)
    return root
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function solveLinear(A: number[][], z: number[]): number[] {
  const n = z.length
  const M = A.map((row, i) => [...row, z[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const d = M[c][c] || 1e-18
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / d
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-18))
}

interface Element {
  part: SandboxPart
  a: string
  b: string
}

function buildNodes(parts: SandboxPart[]): UnionFind {
  const uf = new UnionFind()
  uf.union('tp', 'bp')
  uf.union('tn', 'bn')
  for (const p of parts) {
    if (p.kind === 'wire' || (p.kind === 'switch' && p.closed)) uf.union(stripOf(p.a), stripOf(p.b))
  }
  return uf
}

export function solve(parts: SandboxPart[], supply: number): SolveResult {
  const uf = buildNodes(parts)
  const vcc = uf.find('tp')
  const gnd = uf.find('tn')
  const short = supply > 0 && vcc === gnd
  const elements: Element[] = parts
    .filter(p => p.kind === 'res' || (p.kind === 'led' && !p.burned))
    .map(p => ({ part: p, a: uf.find(stripOf(p.a)), b: uf.find(stripOf(p.b)) }))

  const unknown = [...new Set(elements.flatMap(e => [e.a, e.b]))].filter(n => n !== vcc && n !== gnd)
  const index = new Map(unknown.map((n, i) => [n, i]))
  const fixed = (n: string): number | null => (n === gnd ? 0 : n === vcc ? (short ? 0 : supply) : null)

  let ledOn = new Map(elements.filter(e => e.part.kind === 'led').map(e => [e.part.id, false]))
  let V = new Map<string, number>()
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const n = unknown.length
    const A = Array.from({ length: n }, () => new Array(n).fill(0))
    const z = new Array(n).fill(0)
    unknown.forEach((_, i) => { A[i][i] += GMIN })
    const stamp = (a: string, b: string, g: number, src: number) => {
      const ia = index.get(a)
      const ib = index.get(b)
      const fa = fixed(a)
      const fb = fixed(b)
      if (ia !== undefined) { A[ia][ia] += g; z[ia] += src; if (ib !== undefined) A[ia][ib] -= g; else if (fb !== null) z[ia] += g * fb }
      if (ib !== undefined) { A[ib][ib] += g; z[ib] -= src; if (ia !== undefined) A[ib][ia] -= g; else if (fa !== null) z[ib] += g * fa }
    }
    for (const e of elements) {
      if (e.a === e.b) continue
      if (e.part.kind === 'res') stamp(e.a, e.b, 1 / (e.part.ohms ?? 1000), 0)
      else if (ledOn.get(e.part.id)) {
        const g = 1 / LED_SERIES_OHMS
        stamp(e.a, e.b, g, g * LED_VF[e.part.color ?? 'red'])
      } else stamp(e.a, e.b, GMIN, 0)
    }
    const x = n ? solveLinear(A, z) : []
    V = new Map(unknown.map((node, i) => [node, x[i]]))
    const at = (node: string) => fixed(node) ?? V.get(node) ?? 0
    const next = new Map(ledOn)
    for (const e of elements) {
      if (e.part.kind !== 'led') continue
      const vf = LED_VF[e.part.color ?? 'red']
      const drop = at(e.a) - at(e.b)
      const on = ledOn.get(e.part.id)
      next.set(e.part.id, on ? (drop - vf) / LED_SERIES_OHMS > 0 : drop > vf)
    }
    const changed = [...next].some(([k, v]) => ledOn.get(k) !== v)
    ledOn = next
    if (!changed) break
  }

  const at = (node: string) => fixed(node) ?? V.get(node) ?? 0
  const results: Record<string, PartResult> = {}
  const burnedNow: string[] = []
  for (const p of parts) {
    const a = uf.find(stripOf(p.a))
    const b = uf.find(stripOf(p.b))
    const drop = at(a) - at(b)
    if (p.kind === 'res') {
      const current = a === b ? 0 : drop / (p.ohms ?? 1000)
      results[p.id] = { current, voltage: drop, bypassed: a === b, hot: current * current * (p.ohms ?? 1000) > RESISTOR_RATED_W }
    } else if (p.kind === 'led') {
      const vf = LED_VF[p.color ?? 'red']
      const current = !p.burned && a !== b && ledOn.get(p.id) ? Math.max(0, (drop - vf) / LED_SERIES_OHMS) : 0
      const burns = !p.burned && current > LED_MAX_A && !short
      if (burns) burnedNow.push(p.id)
      const ledState: LedState = p.burned || burns ? 'burned' : a === b ? 'bypassed' : current > 0 ? 'on' : drop < -1 ? 'reversed' : 'off'
      results[p.id] = { current: burns ? current : ledState === 'on' ? current : 0, voltage: drop, ledState, brightness: ledState === 'on' ? Math.min(1, current / LED_FULL_A) : 0 }
    } else {
      results[p.id] = { current: 0, voltage: drop }
    }
  }

  return {
    short,
    nodeOf: s => unknown.indexOf(uf.find(s)),
    voltage: s => {
      const node = uf.find(s)
      if (fixed(node) !== null) return fixed(node)
      return V.has(node) ? V.get(node) ?? 0 : null
    },
    parts: results,
    burnedNow
  }
}

import { stripOf } from '../breadboard/geometry'

export type SandboxKind = 'res' | 'led' | 'wire' | 'switch' | 'button' | 'diode' | 'buzzer' | 'bulb' | 'motor' | 'ldr' | 'pot' | 'npn'
export type LedColor = 'red' | 'yellow' | 'green' | 'blue' | 'white'

export interface SandboxPart {
  id: string
  kind: SandboxKind
  a: string
  b: string
  c?: string
  ohms?: number
  color?: LedColor
  closed?: boolean
  pressed?: boolean
  level?: number
  burned?: boolean
  burnCurrent?: number
}

export const LED_VF: Record<LedColor, number> = { red: 1.8, yellow: 2, green: 2.1, blue: 3, white: 3 }
export const LED_MAX_A = 0.03
export const LED_FULL_A = 0.02
export const RESISTOR_RATED_W = 0.25
export const NPN_BETA = 200
export const NPN_MAX_IB = 0.02
export const NPN_MAX_IC = 0.2
export const BULB_OHMS = 144
export const BULB_RATED_W = 1
export const MOTOR_OHMS = 24
export const MOTOR_START_A = 0.04
export const MOTOR_FULL_A = 0.4
export const POT_OHMS = 10000
export const BUZZER_MIN_A = 0.01

const GMIN = 1e-9
const MAX_ITERATIONS = 80
const VBE = 0.65
const RBE = 25
const VCE_SAT = 0.2
const RCE_SAT = 2
const MIN_SEGMENT_OHMS = 1
const LEAKAGE_A = 1e-6

interface Junction {
  vf: number
  rs: number
  max: number
}

const JUNCTION: Record<'led' | 'diode' | 'buzzer', (p: SandboxPart) => Junction> = {
  led: p => ({ vf: LED_VF[p.color ?? 'red'], rs: 15, max: LED_MAX_A }),
  diode: () => ({ vf: 0.7, rs: 0.5, max: 1 }),
  buzzer: () => ({ vf: 2.8, rs: 120, max: 0.06 })
}

export const ldrOhms = (level = 0.5) => 10 ** (5 - 3 * Math.min(1, Math.max(0, level)))

function resistance(p: SandboxPart): number | null {
  switch (p.kind) {
    case 'res': return p.ohms ?? 1000
    case 'bulb': return BULB_OHMS
    case 'motor': return MOTOR_OHMS
    case 'ldr': return ldrOhms(p.level)
    default: return null
  }
}

const isJunction = (k: SandboxKind): k is 'led' | 'diode' | 'buzzer' => k === 'led' || k === 'diode' || k === 'buzzer'

export type JunctionState = 'on' | 'off' | 'reversed' | 'burned' | 'bypassed'
export type LedState = JunctionState
export type TransistorState = 'off' | 'active' | 'saturated' | 'burned'

export interface PartResult {
  current: number
  voltage: number
  junction?: JunctionState
  ledState?: LedState
  brightness?: number
  active?: boolean
  speed?: number
  hot?: boolean
  bypassed?: boolean
  transistor?: TransistorState
  ib?: number
  ic?: number
  ohms?: number
}

export interface SolveResult {
  short: boolean
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

function connect(parts: SandboxPart[]): UnionFind {
  const uf = new UnionFind()
  uf.union('tp', 'bp')
  uf.union('tn', 'bn')
  for (const p of parts) {
    const joined = p.kind === 'wire' || (p.kind === 'switch' && p.closed) || (p.kind === 'button' && p.pressed)
    if (joined) uf.union(stripOf(p.a), stripOf(p.b))
  }
  return uf
}

interface Circuit {
  node: (hole: string) => string
  index: Map<string, number>
  fixed: Map<string, number>
}

class Mna {
  readonly A: number[][]
  readonly z: number[]
  constructor(private c: Circuit) {
    const n = c.index.size
    this.A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? GMIN : 0)))
    this.z = new Array(n).fill(0)
  }
  private i(node: string): number { return this.c.index.get(node) as number }
  conductance(a: string, b: string, g: number) {
    const ia = this.i(a), ib = this.i(b)
    this.A[ia][ia] += g; this.A[ib][ib] += g; this.A[ia][ib] -= g; this.A[ib][ia] -= g
  }
  source(a: string, b: string, amps: number) {
    this.z[this.i(a)] -= amps; this.z[this.i(b)] += amps
  }
  junction(a: string, b: string, vf: number, rs: number) {
    this.conductance(a, b, 1 / rs)
    this.source(a, b, -vf / rs)
  }
  transconductance(from: string, to: string, ctrlP: string, ctrlN: string, gm: number, offset: number) {
    const f = this.i(from), t = this.i(to), p = this.i(ctrlP), n = this.i(ctrlN)
    this.A[f][p] += gm; this.A[f][n] -= gm; this.A[t][p] -= gm; this.A[t][n] += gm
    this.z[f] += gm * offset; this.z[t] -= gm * offset
  }
  solve(): Map<string, number> {
    for (const [node, v] of this.c.fixed) {
      const r = this.i(node)
      this.A[r] = this.A[r].map((_, j) => (j === r ? 1 : 0))
      this.z[r] = v
    }
    const x = solveLinear(this.A, this.z)
    return new Map([...this.c.index].map(([node, i]) => [node, x[i]]))
  }
}

interface NpnLegs { c: string; b: string; e: string }

function npnLegs(p: SandboxPart, node: (h: string) => string): NpnLegs {
  return { c: node(p.a), b: node(p.c ?? p.a), e: node(p.b) }
}

function stampParts(m: Mna, parts: SandboxPart[], node: (h: string) => string, jOn: Map<string, boolean>, qState: Map<string, TransistorState>) {
  for (const p of parts) {
    if (p.burned) continue
    const a = node(p.a)
    const b = node(p.b)
    const r = resistance(p)
    if (r !== null && a !== b) m.conductance(a, b, 1 / r)
    else if (isJunction(p.kind) && a !== b) {
      const j = JUNCTION[p.kind](p)
      if (jOn.get(p.id)) m.junction(a, b, j.vf, j.rs)
      else m.conductance(a, b, GMIN)
    } else if (p.kind === 'pot' && p.c) {
      const total = p.ohms ?? POT_OHMS
      const pos = Math.min(1, Math.max(0, p.level ?? 0.5))
      const w = node(p.c)
      if (a !== w) m.conductance(a, w, 1 / Math.max(MIN_SEGMENT_OHMS, total * (1 - pos)))
      if (w !== b) m.conductance(w, b, 1 / Math.max(MIN_SEGMENT_OHMS, total * pos))
    } else if (p.kind === 'npn' && p.c) {
      const q = npnLegs(p, node)
      const st = qState.get(p.id)
      if (st === 'off' || q.b === q.e) { m.conductance(q.b, q.e, GMIN); m.conductance(q.c, q.e, GMIN); continue }
      m.junction(q.b, q.e, VBE, RBE)
      if (st === 'active') m.transconductance(q.c, q.e, q.b, q.e, NPN_BETA / RBE, VBE)
      else m.junction(q.c, q.e, VCE_SAT, RCE_SAT)
    }
  }
}

function nextStates(parts: SandboxPart[], node: (h: string) => string, V: Map<string, number>, jOn: Map<string, boolean>, qState: Map<string, TransistorState>) {
  const at = (n: string) => V.get(n) ?? 0
  const j = new Map(jOn)
  const q = new Map(qState)
  for (const p of parts) {
    if (p.burned) continue
    if (isJunction(p.kind)) {
      const { vf, rs } = JUNCTION[p.kind](p)
      const drop = at(node(p.a)) - at(node(p.b))
      j.set(p.id, jOn.get(p.id) ? (drop - vf) / rs > 0 : drop > vf)
    }
    if (p.kind === 'npn' && p.c) {
      const { c, b, e } = npnLegs(p, node)
      const vbe = at(b) - at(e)
      const vce = at(c) - at(e)
      const st = qState.get(p.id) ?? 'off'
      const ib = (vbe - VBE) / RBE
      const beOn = st === 'off' ? vbe > VBE : ib > 0
      if (!beOn) q.set(p.id, 'off')
      else if (st === 'off') q.set(p.id, 'active')
      else if (st === 'active') q.set(p.id, vce < VCE_SAT ? 'saturated' : 'active')
      else if (st === 'saturated') {
        const icSat = (vce - VCE_SAT) / RCE_SAT
        q.set(p.id, icSat > NPN_BETA * ib || icSat < 0 ? 'active' : 'saturated')
      }
    }
  }
  return { j, q }
}

function mapsEqual<K, V>(x: Map<K, V>, y: Map<K, V>) {
  return [...x].every(([k, v]) => y.get(k) === v)
}

export function solve(parts: SandboxPart[], supply: number): SolveResult {
  const uf = connect(parts)
  const node = (h: string) => uf.find(stripOf(h))
  const vcc = uf.find('tp')
  const gnd = uf.find('tn')
  const short = supply > 0 && vcc === gnd
  const nodes = [...new Set([vcc, gnd, ...parts.flatMap(p => [p.a, p.b, ...(p.c ? [p.c] : [])].map(node))])]
  const circuit: Circuit = {
    node,
    index: new Map(nodes.map((n, i) => [n, i])),
    fixed: new Map(short ? [[gnd, 0]] : [[gnd, 0], [vcc, supply]])
  }

  let jOn = new Map(parts.filter(p => isJunction(p.kind)).map(p => [p.id, false]))
  let qState = new Map(parts.filter(p => p.kind === 'npn').map(p => [p.id, 'off' as TransistorState]))
  let V = new Map<string, number>()
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const m = new Mna(circuit)
    stampParts(m, parts, node, jOn, qState)
    V = m.solve()
    const next = nextStates(parts, node, V, jOn, qState)
    const stable = mapsEqual(next.j, jOn) && mapsEqual(next.q, qState)
    jOn = next.j
    qState = next.q
    if (stable) break
  }

  const at = (n: string) => V.get(n) ?? 0
  const results: Record<string, PartResult> = {}
  const burnedNow: string[] = []
  for (const p of parts) {
    const a = node(p.a)
    const b = node(p.b)
    const drop = at(a) - at(b)
    const r = resistance(p)
    if (r !== null) {
      const current = a === b ? 0 : drop / r
      const power = current * current * r
      const base: PartResult = { current, voltage: drop, bypassed: a === b, ohms: r }
      if (p.kind === 'res') results[p.id] = { ...base, hot: power > RESISTOR_RATED_W }
      else if (p.kind === 'ldr') results[p.id] = { ...base, hot: power > RESISTOR_RATED_W / 2 }
      else if (p.kind === 'bulb') results[p.id] = { ...base, brightness: Math.min(1, power / BULB_RATED_W) }
      else results[p.id] = { ...base, speed: Math.abs(current) < MOTOR_START_A ? 0 : Math.min(1, (Math.abs(current) - MOTOR_START_A) / (MOTOR_FULL_A - MOTOR_START_A)) }
    } else if (isJunction(p.kind)) {
      const j = JUNCTION[p.kind](p)
      const on = !p.burned && a !== b && jOn.get(p.id)
      const raw = on ? Math.max(0, (drop - j.vf) / j.rs) : 0
      const current = raw > LEAKAGE_A ? raw : 0
      const burns = !p.burned && current > j.max && !short
      if (burns) burnedNow.push(p.id)
      const state: JunctionState = p.burned || burns ? 'burned' : a === b ? 'bypassed' : current > 0 ? 'on' : drop < -1 ? 'reversed' : 'off'
      const res: PartResult = { current, voltage: drop, junction: state }
      if (p.kind === 'led') results[p.id] = { ...res, ledState: state, brightness: state === 'on' ? Math.min(1, current / LED_FULL_A) : 0 }
      else if (p.kind === 'buzzer') results[p.id] = { ...res, active: state === 'on' && current >= BUZZER_MIN_A }
      else results[p.id] = res
    } else if (p.kind === 'pot' && p.c) {
      const w = node(p.c)
      const total = p.ohms ?? POT_OHMS
      const pos = Math.min(1, Math.max(0, p.level ?? 0.5))
      const i1 = a === w ? 0 : (at(a) - at(w)) / Math.max(MIN_SEGMENT_OHMS, total * (1 - pos))
      const i2 = w === b ? 0 : (at(w) - at(b)) / Math.max(MIN_SEGMENT_OHMS, total * pos)
      const hot = i1 * i1 * total * (1 - pos) > RESISTOR_RATED_W || i2 * i2 * total * pos > RESISTOR_RATED_W
      results[p.id] = { current: Math.max(Math.abs(i1), Math.abs(i2)), voltage: at(w) - at(b), hot }
    } else if (p.kind === 'npn' && p.c) {
      const { c, b: base, e } = npnLegs(p, node)
      const st = p.burned ? 'burned' : qState.get(p.id) ?? 'off'
      const vbe = at(base) - at(e)
      const ib = st === 'off' || st === 'burned' ? 0 : Math.max(0, (vbe - VBE) / RBE)
      const ic = st === 'active' ? NPN_BETA * ib : st === 'saturated' ? Math.max(0, (at(c) - at(e) - VCE_SAT) / RCE_SAT) : 0
      const burns = !p.burned && !short && (ib > NPN_MAX_IB || ic > NPN_MAX_IC)
      if (burns) burnedNow.push(p.id)
      results[p.id] = { current: burns ? Math.max(ib, ic) : ic, voltage: at(c) - at(e), transistor: burns ? 'burned' : st, ib, ic }
    } else {
      results[p.id] = { current: 0, voltage: drop }
    }
  }

  return {
    short,
    voltage: s => {
      const n = uf.find(s)
      return V.has(n) ? V.get(n) ?? 0 : null
    },
    parts: results,
    burnedNow
  }
}

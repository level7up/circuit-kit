import type { SimControl, SimModel } from '../../types/circuit'
import { fmtC, fmtR, fmtV } from '../../lib/format'

export interface ChaseParams {
  R: number
  C: number
  Vin: number
  power: number
  color: number
  lampName: string
  lampGlow: string
}

export interface ChaseState {
  t: number
  ph: number
  clk: number
  count: number
  on: boolean
  I: number
}

export const POWER_OFF = 0
export const POWER_ON = 1
export const PHASES = 3
export const PIECE_PHASE = [0, 1, 2, 0]
export const LEDS_PER_PIECE = 3

const SCHMITT_PERIOD = 0.81
const V5 = 5
const DIODE_DROP = 0.7
const VCE_SAT = 0.2
const SEG_KNEE = 9
const SEG_OHMS = 150

export interface StripColor {
  name: string
  glow: string
}

export const STRIP_COLORS: StripColor[] = [
  { name: 'أبيض', glow: '#eef5ff' },
  { name: 'أبيض دافي', glow: '#fff1c4' },
  { name: 'أحمر', glow: '#ff5d5d' },
  { name: 'أزرق', glow: '#5aa9ff' },
  { name: 'أخضر', glow: '#3ddc84' }
]

const withColor = (p: ChaseParams): ChaseParams => ({ ...p, lampGlow: STRIP_COLORS[p.color]?.glow ?? STRIP_COLORS[0].glow })

export const defaults: ChaseParams = withColor({
  R: 100e3,
  C: 1e-6,
  Vin: 12,
  power: POWER_ON,
  color: 0,
  lampName: 'شريط 20 سم · 4 حتت',
  lampGlow: ''
})

export const stepSeconds = (p: ChaseParams): number => SCHMITT_PERIOD * p.R * p.C
export const pieceCurrent = (p: ChaseParams): number => Math.max(0, (p.Vin - DIODE_DROP - VCE_SAT - SEG_KNEE) / SEG_OHMS)
export const litPieces = (count: number): boolean[] => PIECE_PHASE.map(phase => phase === count)

export function step(s: ChaseState, p: ChaseParams, dt: number): void {
  s.t += dt
  s.on = p.power === POWER_ON
  if (!s.on) {
    s.clk = 0
    s.I = 0
    return
  }
  const wasHigh = s.clk > 0
  s.ph = (s.ph + dt / stepSeconds(p)) % 1
  s.clk = s.ph < 0.5 ? V5 : 0
  if (s.clk > 0 && !wasHigh) s.count = (s.count + 1) % PHASES
  s.I = litPieces(s.count).filter(Boolean).length * pieceCurrent(p)
}

const fmtMs = (s: number) => Math.round(s * 1000) + ' ms'
const fmtMa = (a: number) => Math.round(a * 1000) + ' mA'

function choice(key: keyof ChaseParams, label: string, options: number[], format: (v: number) => string, hint: (p: ChaseParams) => string, look = false): SimControl<ChaseParams> {
  return {
    key,
    label,
    options,
    format,
    get: p => Number(p[key]),
    set: (p, v) => (look ? withColor({ ...p, [key]: v }) : { ...p, [key]: v }),
    hint,
    isDefault: v => v === Number(defaults[key])
  }
}

const controls: SimControl<ChaseParams>[] = [
  choice('power', 'الكهربا', [POWER_ON, POWER_OFF], v => (v ? 'شغالة' : 'مفصولة'), p => (p.power ? 'الشريط بيجري' : 'مطفي')),
  choice('R', 'R1 · السرعة', [22e3, 47e3, 100e3, 220e3, 390e3, 1e6], fmtR, p => 'كل خطوة ' + fmtMs(stepSeconds(p))),
  choice('C', 'C4 · مكثف الساعة', [0.47e-6, 1e-6, 2.2e-6, 4.7e-6], fmtC, p => 'كل خطوة ' + fmtMs(stepSeconds(p))),
  choice('Vin', 'الجهد', [12, 12.6, 13.8, 14.4], v => v + 'V', p => fmtMa(pieceCurrent(p)) + ' لكل حتة'),
  choice('color', 'لون الشريط', STRIP_COLORS.map((_, i) => i), i => STRIP_COLORS[i].name, () => 'نفس الدايرة لأي لون 12V', true)
]

const qLevel = (s: ChaseState, n: number) => (s.on && s.count === n ? V5 : 0)

const NET_READINGS: Record<string, (s: ChaseState, p: ChaseParams) => string> = {
  IN: (s, p) => fmtV(s.on ? p.Vin : 0),
  V12: (s, p) => fmtV(s.on ? p.Vin - DIODE_DROP : 0),
  V5: s => fmtV(s.on ? V5 : 0),
  GND: () => '0.00 V',
  CK: s => fmtV(s.clk),
  Q0: s => fmtV(qLevel(s, 0)),
  Q1: s => fmtV(qLevel(s, 1)),
  Q2: s => fmtV(qLevel(s, 2))
}

export const chaseSim: SimModel<ChaseParams, ChaseState> = {
  title: 'المحاكي: النور وهو بيجري',
  sub: 'الساعة بتدّي نبضة، والعدّاد بيعدّ 0 ← 1 ← 2 ويرجع. كل رقم بيولّع حتة (أو حتتين) من الشريط، فالنور يبان كأنه بيجري. غيّر R1 أو C4 وشوف السرعة.',
  note: 'R1 أو C4 أكبر = خطوة أطول = جري أبطأ. الأرقام تقريبية لأن CD40106 بيختلف من شركة لشركة.',
  footnote: 'آخر 3 ثواني: الساعة فوق، وتحتها الخرج Q0 وQ1 وQ2. كل واحد بيعلى لوحده بالدور.',
  defaults,
  controls,
  traces: [
    { key: 'clk', label: 'الساعة CK', color: '#5aa9ff', height: 34, max: 5, value: s => s.clk },
    { key: 'q0', label: 'Q0 ← A (حتة 1 و4)', color: '#a78bfa', height: 34, max: 5, value: s => qLevel(s, 0), fill: true },
    { key: 'q1', label: 'Q1 ← B (حتة 2)', color: '#34d399', height: 34, max: 5, value: s => qLevel(s, 1), fill: true },
    { key: 'q2', label: 'Q2 ← C (حتة 3)', color: '#fbbf24', height: 34, max: 5, value: s => qLevel(s, 2), fill: true }
  ],
  readouts: [
    { label: 'كل خطوة', value: (_s, p) => fmtMs(stepSeconds(p)) },
    { label: 'لفّة كاملة', value: (_s, p) => fmtMs(stepSeconds(p) * PHASES) },
    { label: 'تيار الشريط', value: s => fmtMa(s.I) }
  ],
  init: () => ({ t: 0, ph: 0, clk: V5, count: 0, on: true, I: 0 }),
  step,
  brightness: s => (s.on ? litPieces(s.count).filter(Boolean).length / PIECE_PHASE.length : 0),
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

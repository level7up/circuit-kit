import type { SimControl, SimModel } from '../../types/circuit'
import { fmtC, fmtR, fmtV } from '../../lib/format'

export interface FlickerParams {
  R: number[]
  Ct: number[]
  kS: number
  frozen: boolean
  stuck: (number | null)[]
  V5: number
  Rm: number[]
  Rf: number
  Cn: number
  Vbe: number
  qDead: boolean
  Re: number
  single: boolean
  Vin: number
  lampKind: 'led' | 'bulb' | 'bare'
  lampFull: number
  lampTau: number
  lampName: string
  lampGlow: string
  Rled: number
  ledDead: boolean
  ledRev: boolean
  ledVf: number
  ledBlink: boolean
  ledVisible: boolean
  ledName: string
  ledGlow: string
  ledShape: '3mm' | '5mm' | '10mm' | 'straw' | 'smd' | 'rgb'
  ledLens: 'diffused' | 'clear'
  fuse: string
  noTvs: boolean
  lampMode: 't10' | 'led'
}

export interface FlickerState {
  ph: number[]
  v: number[]
  vN: number
  I: number
  br: number
  glow: number
  t: number
}

const SCHMITT_PERIOD = 0.81
const MIN_SUPPLY_FOR_REGULATOR = 7
const TRANSISTOR_SAT = 1
const LED_FULL_CURRENT = 0.02
const LED_LAMP_DROPOUT = 6
const NOMINAL_SUPPLY = 12
const FLASHING_LED_HZ = 1.5

export const defaults: FlickerParams = {
  R: [1e6, 390e3, 100e3],
  Ct: [1e-6, 1e-6, 1e-6],
  kS: 1,
  frozen: false,
  stuck: [null, null, null],
  V5: 5,
  Rm: [10e3, 22e3, 47e3],
  Rf: 10e3,
  Cn: 22e-6,
  Vbe: 1.3,
  qDead: false,
  Re: 34,
  single: false,
  Vin: 12,
  lampKind: 'led',
  lampFull: 0.06,
  lampTau: 0,
  lampName: 'T10 LED',
  lampGlow: '#ffd27a',
  Rled: 470,
  ledDead: false,
  ledRev: false,
  ledVf: 2,
  ledBlink: false,
  ledVisible: true,
  ledName: 'LED 5mm',
  ledGlow: '#ffc83d',
  ledShape: '5mm',
  ledLens: 'diffused',
  fuse: '1A',
  noTvs: false,
  lampMode: 't10'
}

export const period = (p: FlickerParams, i: number): number => SCHMITT_PERIOD * p.R[i] * p.Ct[i] * p.kS
export const supply5V = (p: FlickerParams): number => (p.Vin >= MIN_SUPPLY_FOR_REGULATOR ? p.V5 : 0)

function mixConductance(p: FlickerParams): number {
  return p.Rm.reduce((g, r) => g + 1 / r, 0) + (p.Rf ? 1 / p.Rf : 0)
}

export function minNodeVoltage(p: FlickerParams): number {
  return p.Rf ? supply5V(p) * (1 / p.Rf) / mixConductance(p) : 0
}

const PEAK_NODE_VOLTAGE = 4.5

export function maxLampCurrent(p: FlickerParams): number {
  return Math.max(0, (PEAK_NODE_VOLTAGE - p.Vbe) / p.Re)
}

export function smoothingTau(p: FlickerParams): number {
  return p.Cn / mixConductance(p)
}

export interface LampLimits {
  limit: number
  full: number
  dead: boolean
  tau: number
}

export function lampLimits(p: FlickerParams): LampLimits {
  if (p.lampMode === 'led') {
    return { limit: Math.max(0, (p.Vin - p.ledVf - TRANSISTOR_SAT) / p.Rled), full: LED_FULL_CURRENT, dead: p.ledDead || p.ledRev, tau: 0 }
  }
  const limit = p.lampKind === 'bulb' ? p.lampFull * p.Vin / NOMINAL_SUPPLY
    : p.lampKind === 'bare' ? Infinity
      : p.lampFull * Math.max(0, (p.Vin - LED_LAMP_DROPOUT) / (NOMINAL_SUPPLY - LED_LAMP_DROPOUT))
  return { limit, full: p.lampFull, dead: false, tau: p.lampTau }
}

const flashingGate = (p: FlickerParams, t: number): number =>
  p.lampMode === 'led' && p.ledBlink && Math.floor(t * FLASHING_LED_HZ * 2) % 2 ? 0 : 1

export function step(s: FlickerState, p: FlickerParams, dt: number): void {
  const v5 = supply5V(p)
  for (let i = 0; i < 3; i++) {
    s.ph[i] = (s.ph[i] + dt / period(p, i)) % 1
    const held = p.stuck[i]
    s.v[i] = p.frozen ? 0 : held !== null ? held * v5 : s.ph[i] < 0.5 ? v5 : 0
  }
  const g = mixConductance(p)
  const num = p.Rm.reduce((acc, r, i) => acc + s.v[i] / r, 0) + (p.Rf ? v5 / p.Rf : 0)
  const vTarget = num / g
  s.vN += (vTarget - s.vN) * (1 - Math.exp(-dt / (p.Cn / g)))
  const lamp = lampLimits(p)
  s.t += dt
  s.I = p.qDead || lamp.dead ? 0 : Math.min(lamp.limit, Math.max(0, (s.vN - p.Vbe) / p.Re)) * flashingGate(p, s.t)
  const target = Math.min(1, s.I / lamp.full)
  s.glow = lamp.tau ? s.glow + (target - s.glow) * (1 - Math.exp(-dt / lamp.tau)) : target
  s.br = p.lampMode === 'led' && !p.ledVisible ? 0 : s.glow
}

const DEF_R = defaults.R
const hz = (p: FlickerParams, i: number) => '≈ ' + (1 / period(p, i)).toFixed(1) + ' Hz'
const setAt = (arr: number[], i: number, v: number) => arr.map((x, j) => (j === i ? v : x))

function resistorControl(i: number, label: string, options: number[]): SimControl<FlickerParams> {
  return {
    key: 'R' + (i + 1),
    label,
    options,
    format: fmtR,
    get: p => p.R[i],
    set: (p, v) => ({ ...p, R: setAt(p.R, i, v) }),
    hint: p => hz(p, i),
    isDefault: v => v === DEF_R[i]
  }
}

const controls: SimControl<FlickerParams>[] = [
  resistorControl(0, 'R1 · المذبذب البطيء', [470e3, 680e3, 1e6, 1.5e6, 2.2e6]),
  resistorControl(1, 'R2 · المذبذب المتوسط', [220e3, 270e3, 330e3, 390e3, 470e3, 560e3]),
  resistorControl(2, 'R3 · المذبذب السريع', [47e3, 68e3, 100e3, 150e3, 220e3]),
  {
    key: 'Cn', label: 'C8 · مكثف التنعيم', options: [4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6], format: fmtC,
    get: p => p.Cn, set: (p, v) => ({ ...p, Cn: v }), hint: p => fmtC(p.Cn), isDefault: v => v === defaults.Cn
  },
  {
    key: 'Rf', label: 'R7 · الحد الأدنى للإضاءة', options: [0, 22e3, 15e3, 10e3, 6.8e3, 4.7e3], format: fmtR,
    get: p => p.Rf, set: (p, v) => ({ ...p, Rf: v }), hint: p => 'أقل جهد ≈ ' + minNodeVoltage(p).toFixed(2) + 'V', isDefault: v => v === defaults.Rf
  },
  {
    key: 'Re', label: 'R8 ∥ R9 · حد تيار اللمبة', options: [22, 34, 47, 68, 100, 150, 220, 330], format: v => (v === defaults.Re ? '68Ω + 68Ω = 34Ω' : 'مقاومة واحدة ' + fmtR(v)),
    get: p => p.Re, set: (p, v) => ({ ...p, Re: v, single: v !== defaults.Re }), hint: p => 'أقصى تيار ≈ ' + Math.round(maxLampCurrent(p) * 1000) + ' mA', isDefault: v => v === defaults.Re
  }
]

const NET_READINGS: Record<string, (s: FlickerState, p: FlickerParams) => string> = {
  VIN: (_s, p) => '≈ ' + p.Vin.toFixed(1) + ' V',
  V12: () => '≈ 11.3 V',
  V5: (_s, p) => fmtV(supply5V(p)),
  GND: () => '0.00 V',
  AIN: () => 'بين ~1.9 و ~2.9 V',
  BIN: () => 'بين ~1.9 و ~2.9 V',
  CIN: () => 'بين ~1.9 و ~2.9 V',
  A: s => fmtV(s.v[0]),
  B: s => fmtV(s.v[1]),
  C: s => fmtV(s.v[2]),
  N: s => fmtV(s.vN),
  E: (s, p) => fmtV(Math.max(0, s.vN - p.Vbe)),
  LN: () => 'بيتغيّر مع السطوع',
  NC: () => '—'
}

export const flickerSim: SimModel<FlickerParams, FlickerState> = {
  title: 'المحاكي: شوف الرعشة قبل ما تلحم',
  sub: 'المحاكي بيحسب الدايرة نفسها لحظة بلحظة. غيّر القيم وشوف تأثيرها على اللمبة وعلى الموجات، وبعدين ركّب القيم اللي عجبتك.',
  note: 'المقاومة الأصغر = مذبذب أسرع. المكثف الأكبر = رعشة أهدى. R7 أصغر = اللمبة عمرها ما تطفي خالص.',
  footnote: 'آخر 3 ثواني. الخط المتقطع = 1.3V، وده الجهد اللي تحته الـ TIP122 بيقفل واللمبة تطفي. الأرقام تقريبية لأن CD40106 بيختلف من شركة لشركة.',
  defaults,
  controls,
  traces: [
    { key: 'a', label: 'A بطيء', color: '#5aa9ff', height: 28, max: 5, value: s => s.v[0] },
    { key: 'b', label: 'B متوسط', color: '#5aa9ff', height: 28, max: 5, value: s => s.v[1] },
    { key: 'c', label: 'C سريع', color: '#5aa9ff', height: 28, max: 5, value: s => s.v[2] },
    { key: 'n', label: 'النقطة N', color: '#b58cff', height: 112, max: 5, value: s => s.vN, threshold: { value: 1.3, label: '1.3V' }, topLabel: '5V' },
    { key: 'br', label: 'سطوع اللمبة', color: '#ffb547', height: 74, max: 1, value: s => s.br, fill: true }
  ],
  readouts: [
    { label: 'جهد N', value: s => fmtV(s.vN) },
    { label: 'تيار اللمبة', value: s => Math.round(s.I * 1000) + ' mA' },
    { label: 'التنعيم τ', value: (_s, p) => Math.round(smoothingTau(p) * 1000) + ' ms' }
  ],
  init: () => ({ ph: [Math.random(), Math.random(), Math.random()], v: [0, 0, 0], vN: 2.5, I: 0, br: 0.5, glow: 0.5, t: 0 }),
  step,
  brightness: s => s.br,
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

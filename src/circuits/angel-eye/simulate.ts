import type { SimControl, SimModel } from '../../types/circuit'
import { fmtC, fmtR, fmtV } from '../../lib/format'

export interface AngelParams {
  Vin: number
  segments: number
  rings: number
  fade: number
  Rf: number
  Cf: number
  Rb: number
  power: number
  color: number
  lampName: string
  lampGlow: string
}

export interface AngelState {
  t: number
  on: boolean
  vS: number
  I: number
  br: number
}

export const POWER_OFF = 0
export const POWER_ON = 1
export const POWER_AUTO = 2
export const AUTO_ON_S = 4
export const AUTO_OFF_S = 5

export const DIODE_DROP = 0.7
export const SEG_KNEE = 9
export const SEG_OHMS = 150
export const SEG_FULL = 0.02
export const LEDS_PER_SEG = 3
export const SEG_CM = 5
export const VBE = 1.2
export const BETA = 1000
export const VCE_SAT = 0.9
const FADE_DONE = 0.95
const FADE_STEP_S = 0.001
const FADE_LIMIT_S = 20

export interface RingColor {
  name: string
  glow: string
}

export const RING_COLORS: RingColor[] = [
  { name: 'أبيض', glow: '#eef5ff' },
  { name: 'أبيض دافي', glow: '#fff1c4' },
  { name: 'أصفر', glow: '#ffd27a' },
  { name: 'تلجي (أزرق فاتح)', glow: '#9fd8ff' }
]

const ringName = (p: Pick<AngelParams, 'segments' | 'rings'>) =>
  (p.rings === 2 ? 'حلقتين' : 'حلقة') + ' ' + p.segments * LEDS_PER_SEG + ' لمبة'

export const withLook = (p: AngelParams): AngelParams => ({
  ...p,
  lampName: ringName(p),
  lampGlow: RING_COLORS[p.color]?.glow ?? RING_COLORS[0].glow
})

export const defaults: AngelParams = withLook({
  Vin: 13.8,
  segments: 6,
  rings: 2,
  fade: 1,
  Rf: 10e3,
  Cf: 100e-6,
  Rb: 22e3,
  power: POWER_AUTO,
  color: 0,
  lampName: '',
  lampGlow: ''
})

export const segmentCount = (p: AngelParams): number => p.segments * p.rings
export const ringDiameterCm = (segments: number): number => SEG_CM / Math.sin(Math.PI / segments)

export const supplyOf = (p: AngelParams, on: boolean): number =>
  on ? Math.max(0, p.Vin - DIODE_DROP) : 0

const segmentCurrent = (v: number): number => Math.max(0, (v - SEG_KNEE) / SEG_OHMS)

export const ringNeed = (p: AngelParams, vS: number): number =>
  segmentCount(p) * segmentCurrent(p.fade ? vS - VCE_SAT : vS)

export const baseCurrent = (p: AngelParams, vC: number): number => Math.max(0, (vC - VBE) / p.Rb)

export const isPowered = (p: AngelParams, t: number): boolean =>
  p.power === POWER_AUTO ? t % (AUTO_ON_S + AUTO_OFF_S) < AUTO_ON_S : p.power === POWER_ON

export function ringCurrent(p: AngelParams, on: boolean, vC: number): number {
  const vS = supplyOf(p, on)
  if (!p.fade) return ringNeed(p, vS)
  return Math.min(ringNeed(p, vS), BETA * baseCurrent(p, vC))
}

export function chargeStep(p: AngelParams, on: boolean, vC: number, dt: number): number {
  const vS = supplyOf(p, on)
  const inflow = on ? (vS - vC) / p.Rf : 0
  const outflow = baseCurrent(p, vC)
  return vC + ((inflow - outflow) * dt) / p.Cf
}

export function maxCurrent(p: AngelParams): number {
  const vS = supplyOf(p, true)
  const settled = (vS * p.Rb + VBE * p.Rf) / (p.Rf + p.Rb)
  return BETA * baseCurrent(p, settled)
}

export function fadeTime(p: AngelParams): number {
  if (!p.fade) return 0
  const target = FADE_DONE * ringNeed(p, supplyOf(p, true))
  if (!target || maxCurrent(p) < target) return Infinity
  let vC = 0
  let t = 0
  while (ringCurrent(p, true, vC) < target && t < FADE_LIMIT_S) {
    vC = chargeStep(p, true, vC, FADE_STEP_S)
    t += FADE_STEP_S
  }
  return t
}

export const perSegment = (p: AngelParams, I: number): number => I / segmentCount(p)
export const glowOf = (p: AngelParams, I: number): number => Math.min(1, Math.sqrt(perSegment(p, I) / SEG_FULL))

export function step(s: AngelState, p: AngelParams, dt: number): void {
  s.t += dt
  s.on = isPowered(p, s.t)
  s.vS = p.fade ? chargeStep(p, s.on, s.vS, dt) : 0
  s.I = ringCurrent(p, s.on, s.vS)
  s.br = glowOf(p, s.I)
}

const fmtTime = (t: number) => (t === Infinity ? 'مش هتوصل للآخر' : t ? '≈ ' + t.toFixed(1) + ' ثانية' : 'فوري')
const fmtMa = (a: number) => Math.round(a * 1000) + ' mA'

function choice(key: keyof AngelParams, label: string, options: number[], format: (v: number) => string, hint: (p: AngelParams) => string, look = false): SimControl<AngelParams> {
  return {
    key,
    label,
    options,
    format,
    get: p => Number(p[key]),
    set: (p, v) => (look ? withLook({ ...p, [key]: v }) : { ...p, [key]: v }),
    hint,
    isDefault: v => v === Number(defaults[key])
  }
}

const POWER_NAMES: Record<number, string> = {
  [POWER_AUTO]: 'تلقائي: تولّع ' + AUTO_ON_S + ' ث وتطفي ' + AUTO_OFF_S + ' ث',
  [POWER_ON]: 'مولّعة على طول',
  [POWER_OFF]: 'مطفية'
}

const controls: SimControl<AngelParams>[] = [
  choice('power', 'أنوار الركن', [POWER_AUTO, POWER_ON, POWER_OFF], v => POWER_NAMES[v], () => 'عشان تشوف الفيد وهو بيولّع'),
  choice('fade', 'طريقة التوصيل', [1, 0], v => (v ? 'فيد ناعم (TIP122)' : 'مباشر من غير ترانزستور'), p => fmtTime(fadeTime(p))),
  choice('Cf', 'C2 · مكثف الفيد', [22e-6, 47e-6, 100e-6, 220e-6, 470e-6], fmtC, p => 'الفيد ' + fmtTime(fadeTime(p))),
  choice('Rf', 'R1 · مقاومة الشحن', [4.7e3, 10e3, 22e3], fmtR, p => 'الفيد ' + fmtTime(fadeTime(p))),
  choice('Rb', 'R2 · مقاومة القاعدة', [10e3, 22e3, 47e3], fmtR, p => 'أقصى تيار ≈ ' + fmtMa(maxCurrent(p))),
  choice('segments', 'حجم الحلقة', [4, 5, 6, 8], v => v * LEDS_PER_SEG + ' لمبة (' + v + ' حتت × 5 سم)', p => 'القطر ≈ ' + ringDiameterCm(p.segments).toFixed(1) + ' سم', true),
  choice('rings', 'عدد الحلقات', [2, 1], v => (v === 2 ? 'حلقتين (الفانوسين)' : 'حلقة واحدة'), p => 'التيار كله ≈ ' + fmtMa(ringNeed(p, supplyOf(p, true))), true),
  choice('Vin', 'جهد العربية', [12, 12.6, 13.8, 14.4], v => v + 'V' + (v >= 13.8 ? ' (الموتور دوّار)' : ' (الموتور واقف)'), p => fmtMa(perSegment(p, ringNeed(p, supplyOf(p, true)))) + ' لكل 3 لمبات'),
  choice('color', 'لون الشريط', RING_COLORS.map((_, i) => i), i => RING_COLORS[i].name, () => 'الأبيض هو الأسلم قانونياً', true)
]

const NET_READINGS: Record<string, (s: AngelState, p: AngelParams) => string> = {
  IN: (s, p) => fmtV(s.on ? p.Vin : 0),
  VP: (s, p) => fmtV(supplyOf(p, s.on)),
  S: (s, p) => (p.fade ? fmtV(s.vS) : '—'),
  B: (s, p) => (p.fade ? fmtV(Math.min(s.vS, VBE)) : '—'),
  C: (s, p) => fmtV(s.I ? VCE_SAT : supplyOf(p, s.on)),
  GND: () => '0.00 V'
}

export const angelSim: SimModel<AngelParams, AngelState> = {
  title: 'المحاكي: الحلقة وهي بتولّع',
  sub: 'المحاكي بيولّع أنوار الركن ويطفيها لوحده عشان تشوف الفيد. غيّر المكثف أو المقاومات وشوف الفيد بيطوّل ولا بيقصر، وشوف التيار مناسب للشريط ولا لأ.',
  note: 'C2 أكبر = فيد أبطأ. R2 أصغر = الترانزستور يقدر يشيل حلقات أطول. لو طفّيت وولّعت بسرعة، الفيد مش هيتكرر كامل لأن المكثف لسه مشحون.',
  footnote: 'آخر 3 ثواني. الأرقام تقريبية: الشريط الـ 12V بيختلف من نوع للتاني، والـ TIP122 تكبيره بيختلف من حتة للتانية.',
  defaults,
  controls,
  traces: [
    { key: 'in', label: 'أنوار الركن', color: '#ff5d5d', height: 34, max: 15, value: s => (s.on ? 1 : 0) * 15, fill: true },
    { key: 's', label: 'جهد المكثف C2', color: '#b58cff', height: 100, max: 12, value: s => s.vS, threshold: { value: VBE, label: '1.2V' }, topLabel: '12V' },
    { key: 'br', label: 'سطوع الحلقة', color: '#ffb547', height: 90, max: 1, value: s => s.br, fill: true }
  ],
  readouts: [
    { label: 'الأنوار', value: s => (s.on ? 'شغالة' : 'مطفية') },
    { label: 'تيار الحلقات', value: s => fmtMa(s.I) },
    { label: 'لكل 3 لمبات', value: (s, p) => fmtMa(perSegment(p, s.I)) },
    { label: 'وقت الفيد', value: (_s, p) => fmtTime(fadeTime(p)) }
  ],
  init: () => ({ t: 0, on: false, vS: 0, I: 0, br: 0 }),
  step,
  brightness: s => s.br,
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

import type { SimControl, SimModel } from '../../types/circuit'
import { fmtR, fmtV } from '../../lib/format'
import { defaults as flickerDefaults, step as flickerStep, type FlickerParams, type FlickerState } from '../parking-flicker/simulate'
import {
  LOCKED, UNLOCKED, WELCOME_OFF, WELCOME_ON, WELCOME_R, WELCOME_R_OPTIONS, welcomeInit, welcomeLeft, welcomeSeconds, welcomeStep,
  type WelcomeInput, type WelcomeState
} from './welcome'
import { BUTTON_IN, BUTTON_OUT } from './mode-button'

export interface AngelParams {
  Vin: number
  segments: number
  rings: number
  power: number
  style: number
  ringType: number
  color: number
  welcome: number
  button: number
  lock: number
  wR: number
  lampName: string
  lampGlow: string
}

export interface AngelState {
  t: number
  on: boolean
  parking: boolean
  I: number
  br: number
  fl: FlickerState
  w: WelcomeState
}

export const POWER_OFF = 0
export const POWER_ON = 1
export const STEADY = 0
export const OLD_TV = 1
export const TV_R = [220e3, 47e3, 10e3]
export const TV_CN = 1e-6
export const TV_EMITTER = [68, 68, 68]

export const DIODE_DROP = 0.7
export const SEG_KNEE = 9
export const SEG_OHMS = 150
export const SEG_FULL = 0.02
export const STRIP_LEDS_PER_PIECE = 5
export const LEDS_PER_GROUP = 3
export const SEG_CM = 5
export const STRIP_RING = 0
export const LED_RING = 1
export const LED_GROUP_OHMS = 220

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

type RingShape = Pick<AngelParams, 'segments' | 'ringType'>

export const ledsPerSegment = (p: Pick<AngelParams, 'ringType'>): number => (p.ringType === LED_RING ? LEDS_PER_GROUP : STRIP_LEDS_PER_PIECE)
export const ledsPerRing = (p: RingShape): number => p.segments * ledsPerSegment(p)
const segmentWord = (p: Pick<AngelParams, 'ringType'>) => (p.ringType === LED_RING ? 'مجموعة' : 'حتة')

const ringName = (p: RingShape & Pick<AngelParams, 'rings'>) =>
  (p.rings === 2 ? 'حلقتين' : 'حلقة') + ' ' + ledsPerRing(p) + (p.ringType === LED_RING ? ' LED 5mm' : ' لمبة')

export const withLook = (p: AngelParams): AngelParams => ({
  ...p,
  lampName: ringName(p),
  lampGlow: RING_COLORS[p.color]?.glow ?? RING_COLORS[0].glow
})

export const defaults: AngelParams = withLook({
  Vin: 13.8,
  segments: 6,
  rings: 2,
  power: POWER_ON,
  style: OLD_TV,
  ringType: STRIP_RING,
  color: 0,
  welcome: WELCOME_ON,
  button: BUTTON_OUT,
  lock: LOCKED,
  wR: WELCOME_R,
  lampName: '',
  lampGlow: ''
})

export const segmentCount = (p: AngelParams): number => p.segments * p.rings
export const ringDiameterCm = (segments: number): number => SEG_CM / Math.sin(Math.PI / segments)
export const supplyOf = (p: AngelParams, on: boolean): number => (on ? Math.max(0, p.Vin - DIODE_DROP) : 0)

const groupOhms = (p: AngelParams): number => (p.ringType === LED_RING ? LED_GROUP_OHMS : SEG_OHMS)
const segmentCurrent = (p: AngelParams, v: number): number => Math.max(0, (v - SEG_KNEE) / groupOhms(p))

export const ringCurrent = (p: AngelParams, on: boolean): number => segmentCount(p) * segmentCurrent(p, supplyOf(p, on))
export const ledSpacingCm = (p: AngelParams): number => (Math.PI * ringDiameterCm(p.segments)) / ledsPerRing(p)
export const perSegment = (p: AngelParams, I: number): number => I / segmentCount(p)
export const glowOf = (p: AngelParams, I: number): number => Math.min(1, Math.sqrt(perSegment(p, I) / SEG_FULL))

export const tvCircuit = (p: AngelParams): FlickerParams => ({
  ...flickerDefaults,
  R: TV_R,
  Cn: TV_CN,
  emitter: TV_EMITTER,
  Vin: p.Vin,
  lampKind: 'led',
  lampFull: ringCurrent({ ...p, Vin: 12 }, true),
  lampName: p.lampName,
  lampGlow: p.lampGlow
})

const flickerOff = (fl: FlickerState): FlickerState => ({ ...fl, I: 0, br: 0, glow: 0 })

export const welcomeInput = (p: AngelParams): WelcomeInput => ({ enabled: p.welcome === WELCOME_ON, lock: p.lock, R: p.wR, vdd: supplyOf(p, true) })
export const welcomeTime = (p: AngelParams): number => welcomeSeconds(p.wR, supplyOf(p, true))

export function step(s: AngelState, p: AngelParams, dt: number): void {
  s.t += dt
  welcomeStep(s.w, welcomeInput(p), dt)
  s.parking = p.power === POWER_ON
  s.on = s.parking || s.w.on
  const flickering = p.style === OLD_TV && s.parking && p.button !== BUTTON_IN
  if (flickering) flickerStep(s.fl, tvCircuit(p), dt)
  else s.fl = flickerOff(s.fl)
  const steady = s.w.on || (s.parking && !flickering)
  s.I = steady ? ringCurrent(p, true) : flickering ? Math.min(s.fl.I, ringCurrent(p, true)) : 0
  s.br = glowOf(p, s.I)
}

const fmtMa = (a: number) => Math.round(a * 1000) + ' mA'
const fmtSec = (t: number) => t.toFixed(1) + ' ثانية'

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

const controls: SimControl<AngelParams>[] = [
  choice('power', 'أنوار الركن', [POWER_ON, POWER_OFF], v => (v ? 'شغالة' : 'مطفية'), p => (p.power ? 'الحلقة منوّرة' : 'الحلقة مطفية')),
  choice('style', 'شكل النور', [STEADY, OLD_TV], v => (v === OLD_TV ? '📺 بترعش زي التلفزيون القديم' : 'ثابت'), p => (p.style === OLD_TV ? 'على دايرة الرعشة' : 'على بورد الحماية بس')),
  choice('ringType', 'الحلقة معمولة من', [STRIP_RING, LED_RING], v => (v === LED_RING ? '💡 LED 5mm في غطا مخروم' : '✂️ حتت شريط LED'), p => (p.ringType === LED_RING ? 'كل ' + LEDS_PER_GROUP + ' لمبات + 220Ω' : 'كل حتة ' + STRIP_LEDS_PER_PIECE + ' لمبات (حوالي 5 سم)'), true),
  choice('segments', 'حجم الحلقة', [4, 5, 6, 8], v => v + ' حتت / مجموعات', p => ledsPerRing(p) + ' لمبة · القطر ≈ ' + ringDiameterCm(p.segments).toFixed(1) + ' سم' + (p.ringType === LED_RING ? ' · لمبة كل ' + ledSpacingCm(p).toFixed(1) + ' سم' : ''), true),
  choice('rings', 'عدد الحلقات', [2, 1], v => (v === 2 ? 'حلقتين (الفانوسين)' : 'حلقة واحدة'), p => 'التيار كله ≈ ' + fmtMa(ringCurrent(p, true)), true),
  choice('Vin', 'جهد العربية', [12, 12.6, 13.8, 14.4], v => v + 'V' + (v >= 13.8 ? ' (الموتور دوّار)' : ' (الموتور واقف)'), p => fmtMa(perSegment(p, ringCurrent(p, true))) + ' لكل ' + segmentWord(p)),
  choice('color', 'لون الشريط', RING_COLORS.map((_, i) => i), i => RING_COLORS[i].name, () => 'الأبيض هو الأسلم قانونياً', true),
  choice('button', 'زرار الشكل (على الرعشة)', [BUTTON_OUT, BUTTON_IN], v => (v === BUTTON_IN ? '⭕ مضغوط: ثابت' : '📺 طالع: رعشة'), p => (p.style !== OLD_TV ? 'الزرار على دايرة الرعشة بس' : p.button === BUTTON_IN ? 'سالب الحلقتين على الأرضي على طول' : 'الرعشة شغالة')),
  choice('welcome', 'الترحيب مع السنتر لوك', [WELCOME_ON, WELCOME_OFF], v => (v === WELCOME_ON ? '🔒 تنوّر لما تقفل أو تفتح' : 'من غير ترحيب'), p => (p.welcome === WELCOME_ON ? 'بورد الترحيب + موسفت IRF9540N' : 'مع أنوار الركن بس')),
  choice('lock', 'السنتر لوك', [LOCKED, UNLOCKED], v => (v === LOCKED ? '🔒 مقفولة' : '🔓 مفتوحة'), p => (p.welcome === WELCOME_ON ? 'غيّرها: الحلقتين ينوّروا ' + fmtSec(welcomeTime(p)) : 'شغّل الترحيب الأول')),
  choice('wR', 'R13 · مدة الترحيب', WELCOME_R_OPTIONS, fmtR, p => '≈ ' + fmtSec(welcomeTime(p)) + ' مع C9 100µF')
]

const NET_READINGS: Record<string, (s: AngelState, p: AngelParams) => string> = {
  IN: (s, p) => fmtV(s.on ? p.Vin : 0),
  VP: (s, p) => fmtV(supplyOf(p, s.on)),
  GND: () => '0.00 V',
  BAT: (_s, p) => fmtV(p.Vin),
  VW: (_s, p) => fmtV(supplyOf(p, true)),
  WT: s => fmtV(s.w.vt),
  PG: (s, p) => fmtV(s.w.on ? 0 : supplyOf(p, true)),
  MD: (s, p) => fmtV(s.w.on ? supplyOf(p, true) : 0),
  OUT: (s, p) => fmtV(s.on ? supplyOf(p, true) - (s.w.on ? DIODE_DROP : 0) : 0),
  WB: s => fmtV(s.w.on ? 1.4 : 0),
  RN: s => (s.w.on ? fmtV(0.9) : '—'),
  LK: (s, p) => fmtV(s.w.pulse > 0 && p.lock === LOCKED ? p.Vin : 0),
  UL: (s, p) => fmtV(s.w.pulse > 0 && p.lock === UNLOCKED ? p.Vin : 0)
}

export const angelSim: SimModel<AngelParams, AngelState> = {
  title: 'المحاكي: الحلقة على العربية',
  sub: 'ولّع الركن الحلقة تنوّر، اطفيه تطفي. واطفي الركن وغيّر السنتر لوك (اقفل أو افتح): الحلقتين ينوّروا <b>ثابتين</b> حوالي 5 ثواني (من غير رعشة) ويطفوا لوحدهم. غيّر حجم الحلقة وعددها وجهد العربية وشوف التيار.',
  note: 'الشريط الـ 12V بيتحمّل جهد العربية لوحده. والموتور دوّار كل حتة بتسحب حوالي 27mA بدل 20mA، وده عادي للشريط في العربيات. الدايود بياخد 0.7V فبيخلّيه أبرد شوية.',
  footnote: 'الأرقام تقريبية: الشريط الـ 12V بيختلف من نوع للتاني.',
  defaults,
  controls,
  traces: [
    { key: 'in', label: 'أنوار الركن', color: '#ff5d5d', height: 50, max: 15, value: s => (s.parking ? 15 : 0), fill: true },
    { key: 'lk', label: 'نبضة السنتر لوك', color: '#22c55e', height: 40, max: 15, value: s => (s.w.pulse > 0 ? 15 : 0), fill: true },
    { key: 'wt', label: 'مكثف الترحيب C9', color: '#7dd3fc', height: 60, max: 14, value: s => s.w.vt, threshold: { value: 5, label: 'تحت الخط بيطفي' } },
    { key: 'br', label: 'سطوع الحلقة', color: '#ffb547', height: 120, max: 1, value: s => s.br, fill: true }
  ],
  readouts: [
    { label: 'الأنوار', value: s => (s.on ? 'شغالة' : 'مطفية') },
    { label: 'تيار الحلقات', value: s => fmtMa(s.I) },
    { label: 'لكل حتة', value: (s, p) => fmtMa(perSegment(p, s.I)) },
    { label: 'الترحيب', value: (s, p) => (s.w.on ? 'باقي ' + fmtSec(welcomeLeft(s.w, welcomeInput(p))) : p.welcome === WELCOME_ON ? 'مستني القفل' : 'مقفول') }
  ],
  init: p => ({ t: 0, on: false, parking: false, I: 0, br: 0, w: welcomeInit(p.lock), fl: { ph: [Math.random(), Math.random(), Math.random()], v: [0, 0, 0], vN: 0, I: 0, br: 0, glow: 0, t: 0 } }),
  step,
  brightness: s => s.br,
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

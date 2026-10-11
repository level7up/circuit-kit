import type { SimControl, SimModel } from '../../types/circuit'
import { fmtR, fmtV } from '../../lib/format'
import { BETWEEN, PATTERNS, STEPS, busHigh, outputs, type BusId } from './patterns'

export const OFF = 0
export const ON = 1

export const FAULT_NONE = 0
export const FAULT_NO_LOAD = 1
export const FAULT_SHORT = 2
export const FAULT_LOGIC_LOST = 3
export const FAULT_CLOCK_STUCK = 4

export interface PatternParams {
  enable: number
  pattern: number
  R: number
  vbat: number
  loadAmps: number
  fault: number
  lampName: string
  lampGlow: string
}

export interface PatternState {
  t: number
  ph: number
  clk: number
  step: number
  powered: boolean
  v9: number
  gl: number
  gr: number
  left: boolean
  right: boolean
  iL: number
  iR: number
  fuseBlown: boolean
  heat: number
}

export const C4 = 1e-6
export const SCHMITT_PERIOD = 0.81
export const DIODE_DROP = 0.7
export const SIGNAL_DIODE = 0.7
export const REG_VOLTS = 9
export const REG_DROPOUT = 2
export const LOGIC_MIN = 3
export const GATE_THRESHOLD = 2.5
export const RDS_ON = 0.025
export const BRANCH_FUSE = 2

export const defaults: PatternParams = {
  enable: ON,
  pattern: 0,
  R: 100e3,
  vbat: 12.6,
  loadAmps: 1,
  fault: FAULT_NONE,
  lampName: 'كشافين LED للعرض',
  lampGlow: '#eef5ff'
}

export const stepSeconds = (p: PatternParams): number => SCHMITT_PERIOD * p.R * C4
export const logicVolts = (vbat: number): number => Math.max(0, Math.min(REG_VOLTS, vbat - DIODE_DROP - REG_DROPOUT))

function isLogicAlive(p: PatternParams): boolean {
  return p.enable === ON && p.fault !== FAULT_LOGIC_LOST && logicVolts(p.vbat) >= LOGIC_MIN
}

function sideAmps(gate: number, p: PatternParams, isLeft: boolean, s: PatternState): number {
  if (gate < GATE_THRESHOLD) return 0
  if (!isLeft) return p.loadAmps
  if (p.fault === FAULT_NO_LOAD || s.fuseBlown) return 0
  if (p.fault === FAULT_SHORT) {
    s.fuseBlown = true
    return 0
  }
  return p.loadAmps
}

export function step(s: PatternState, p: PatternParams, dt: number): void {
  s.t += dt
  if (p.fault !== FAULT_SHORT) s.fuseBlown = false
  const alive = isLogicAlive(p)
  if (!alive) {
    Object.assign(s, { powered: false, v9: 0, clk: 0, gl: 0, gr: 0, left: false, right: false, iL: 0, iR: 0, heat: 0 })
    return
  }
  if (!s.powered) Object.assign(s, { powered: true, step: 0, ph: 0, clk: logicVolts(p.vbat) })
  s.v9 = logicVolts(p.vbat)
  const wasHigh = s.clk > 0
  if (p.fault !== FAULT_CLOCK_STUCK) s.ph = (s.ph + dt / stepSeconds(p)) % 1
  s.clk = s.ph < 0.5 ? s.v9 : 0
  if (s.clk > 0 && !wasHigh) s.step = (s.step + 1) % STEPS
  const o = outputs(p.pattern, s.step)
  const gate = s.v9 - SIGNAL_DIODE
  s.gl = o.left ? gate : 0
  s.gr = o.right ? gate : 0
  s.iL = sideAmps(s.gl, p, true, s)
  s.iR = sideAmps(s.gr, p, false, s)
  s.left = s.iL > 0
  s.right = s.iR > 0
  s.heat = (s.iL * s.iL + s.iR * s.iR) * RDS_ON
}

const fmtMs = (sec: number) => Math.round(sec * 1000) + ' ms'
const fmtA = (a: number) => a.toFixed(2) + ' A'

const PATTERN_TEXT = (v: number) => (v === BETWEEN ? '⏸ بين وضعين' : PATTERNS[v].icon + ' ' + PATTERNS[v].name)

const FAULT_TEXT: Record<number, string> = {
  [FAULT_NONE]: 'مفيش',
  [FAULT_NO_LOAD]: 'لمبة الشمال مفصولة',
  [FAULT_SHORT]: 'قصر في لمبة الشمال',
  [FAULT_LOGIC_LOST]: 'الـ 9V فصل',
  [FAULT_CLOCK_STUCK]: 'الساعة وقفت'
}

const FAULT_HINT: Record<number, string> = {
  [FAULT_NONE]: 'كل حاجة سليمة',
  [FAULT_NO_LOAD]: 'اليمين شغال عادي، والموسفت مش بيسخن',
  [FAULT_SHORT]: 'فيوز الشمال 2A بيتحرق أول ما يولّع، واليمين يكمّل',
  [FAULT_LOGIC_LOST]: 'R6 وR7 بيشدّوا البوابات للأرضي: الاتنين يطفوا',
  [FAULT_CLOCK_STUCK]: 'العدّاد بيقف على خطوة: جنب ممكن يفضل منوّر'
}

function choice(key: keyof PatternParams, label: string, options: number[], format: (v: number) => string, hint: (p: PatternParams) => string): SimControl<PatternParams> {
  return {
    key,
    label,
    options,
    format,
    get: p => Number(p[key]),
    set: (p, v) => ({ ...p, [key]: v }),
    hint,
    isDefault: v => v === Number(defaults[key])
  }
}

const controls: SimControl<PatternParams>[] = [
  choice('enable', 'السويتش الرئيسي', [ON, OFF], v => (v === ON ? 'شغّال' : 'مقفول'), p => (p.enable === ON ? 'الدايرة شغالة' : 'كل حاجة مطفية: البوابات على الأرضي')),
  choice('pattern', 'السويتش الدوّار', [0, 1, 2, 3, BETWEEN], PATTERN_TEXT, p => (p.pattern === BETWEEN ? 'وانت بتلف: الاتنين مطفيين' : 'الشمال من خط ' + PATTERNS[p.pattern].left.slice(1) + ' واليمين من خط ' + PATTERNS[p.pattern].right.slice(1))),
  choice('R', 'R1 · السرعة', [47e3, 68e3, 100e3, 150e3, 220e3], fmtR, p => 'كل خطوة ' + fmtMs(stepSeconds(p)) + ' · لفّة ' + fmtMs(stepSeconds(p) * STEPS)),
  choice('vbat', 'جهد البطارية', [9.6, 12, 12.6, 14.4], v => v + 'V', p => 'الـ 9V = ' + fmtV(logicVolts(p.vbat)) + (logicVolts(p.vbat) < REG_VOLTS ? ' (الـ 7809 مش لاحق)' : '')),
  choice('loadAmps', 'كل كشاف بيسحب', [0.3, 0.5, 1, 1.5], v => fmtA(v) + ' (' + Math.round(v * 12) + ' وات)', p => (p.loadAmps > 1.5 ? 'أكتر من الفيوز' : 'جوه فيوز 2A')),
  choice('fault', 'جرّب عطل', [FAULT_NONE, FAULT_NO_LOAD, FAULT_SHORT, FAULT_LOGIC_LOST, FAULT_CLOCK_STUCK], v => FAULT_TEXT[v], p => FAULT_HINT[p.fault])
]

const qVolts = (s: PatternState, n: number) => (s.powered && s.step === n ? s.v9 : 0)
const busVolts = (s: PatternState, bus: BusId) => (s.powered && busHigh(bus, s.step) ? s.v9 - SIGNAL_DIODE : 0)
const drainVolts = (p: PatternParams, amps: number, connected: boolean) => (amps > 0 ? amps * RDS_ON : connected ? p.vbat : 0)
const selected = (p: PatternParams, side: 'left' | 'right'): BusId | undefined => PATTERNS[p.pattern]?.[side]

const NET_READINGS: Record<string, (s: PatternState, p: PatternParams) => string> = {
  IN: (_s, p) => fmtV(p.enable === ON ? p.vbat : 0),
  V12: (_s, p) => fmtV(p.enable === ON ? p.vbat - DIODE_DROP : 0),
  V9: s => fmtV(s.v9),
  GND: () => '0.00 V',
  CK: s => fmtV(s.clk),
  GL: s => fmtV(s.gl),
  GR: s => fmtV(s.gr),
  SL: (s, p) => fmtV(selected(p, 'left') ? busVolts(s, selected(p, 'left')!) : 0),
  SR: (s, p) => fmtV(selected(p, 'right') ? busVolts(s, selected(p, 'right')!) : 0),
  OL: (s, p) => fmtV(drainVolts(p, s.iL, p.fault !== FAULT_NO_LOAD && !s.fuseBlown)),
  OR: (s, p) => fmtV(drainVolts(p, s.iR, true)),
  ...Object.fromEntries(Array.from({ length: STEPS - 1 }, (_, n) => ['Q' + n, (s: PatternState) => fmtV(qVolts(s, n))])),
  ...Object.fromEntries((['BA', 'BB', 'BC', 'BD', 'BE'] as BusId[]).map(bus => [bus, (s: PatternState) => fmtV(busVolts(s, bus))]))
}

export const patternSim: SimModel<PatternParams, PatternState> = {
  title: 'المحاكي: الأشكال الأربعة',
  sub: 'الساعة بتدّي نبضة كل خطوة، والعدّاد بيعدّ من 0 لـ 9 ويرجع. الدايودات بتجمّع الخطوات في 5 خطوط، والسويتش الدوّار بيختار خط للشمال وخط لليمين. جرّب كل وضع وكل عطل.',
  note: 'ده محاكي للمنطق بس (مش SPICE): بيفترض إن الموسفت مفتاح مثالي، والكشافات LED بتسحب تيار ثابت. مفيش ريلاي في الدايرة، فمفيش حاجة ميكانيكية محتاجة تتحاكي.',
  footnote: 'آخر 3 ثواني: الساعة، وبوابة الشمال، وبوابة اليمين، وتيار الكشافين. كل وضع ليه شكل ثابت بيتكرر كل 10 خطوات.',
  defaults,
  controls,
  traces: [
    { key: 'clk', label: 'الساعة CK', color: '#5aa9ff', height: 30, max: 9, value: s => s.clk },
    { key: 'gl', label: 'بوابة الشمال (G1)', color: '#60a5fa', height: 40, max: 9, value: s => s.gl, fill: true },
    { key: 'gr', label: 'بوابة اليمين (G2)', color: '#f87171', height: 40, max: 9, value: s => s.gr, fill: true },
    { key: 'amps', label: 'تيار الكشافين', color: '#ffb547', height: 50, max: 3.5, value: s => s.iL + s.iR, fill: true, threshold: { value: BRANCH_FUSE, label: 'فيوز كل كشاف 2A' } }
  ],
  readouts: [
    { label: 'الخطوة', value: s => (s.powered ? String(s.step) : '—') },
    { label: 'كل خطوة', value: (_s, p) => fmtMs(stepSeconds(p)) },
    { label: 'الـ 9V', value: s => fmtV(s.v9) },
    { label: 'الشمال', value: s => (s.left ? '💡 ' : '') + fmtA(s.iL) },
    { label: 'اليمين', value: s => (s.right ? '💡 ' : '') + fmtA(s.iR) },
    { label: 'حرارة الموسفت', value: s => (s.heat * 1000).toFixed(0) + ' mW' },
    { label: 'فيوز الشمال', value: s => (s.fuseBlown ? '🔥 اتحرق' : 'سليم') }
  ],
  init: () => ({ t: 0, ph: 0, clk: 0, step: 0, powered: false, v9: 0, gl: 0, gr: 0, left: false, right: false, iL: 0, iR: 0, fuseBlown: false, heat: 0 }),
  step,
  brightness: s => ((s.left ? 1 : 0) + (s.right ? 1 : 0)) / 2,
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

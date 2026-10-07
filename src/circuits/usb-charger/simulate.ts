import type { SimControl, SimModel } from '../../types/circuit'
import { fmtV } from '../../lib/format'

export const KEY_OFF = 0
export const KEY_ACC = 1
export const ENGINE_RUN = 2
export const CRANKING = 3

export const BUCK = 0
export const LINEAR = 1

export interface ChargerParams {
  car: number
  phones: number
  phoneAmps: number
  converter: number
  lampName: string
  lampGlow: string
}

export interface ChargerState {
  t: number
  vbat: number
  vin: number
  vout: number
  iout: number
  iin: number
  heat: number
  diodeHeat: number
  limited: boolean
}

export const BATTERY_ACC = 12.5
export const BATTERY_RUN = 14.2
export const BATTERY_CRANK = 9.6
export const CRANK_PERIOD = 6
export const CRANK_DIP = 1.2
export const DIODE_DROP = 0.85
export const USB_VOLTS = 5.1
export const BUCK_EFFICIENCY = 0.9
export const BUCK_MIN_IN = 6.5
export const BUCK_LIMIT = 3
export const LINEAR_DROPOUT = 2
export const LINEAR_LIMIT = 1.5
export const IDLE_AMPS = 0.012
export const FUSE_AMPS = 3

export const defaults: ChargerParams = {
  car: ENGINE_RUN,
  phones: 2,
  phoneAmps: 1,
  converter: BUCK,
  lampName: 'لمبة الموديول',
  lampGlow: '#5aa9ff'
}

export function batteryVolts(car: number, t: number): number {
  if (car === KEY_OFF) return 0
  if (car === KEY_ACC) return BATTERY_ACC
  if (car === CRANKING) return t % CRANK_PERIOD < CRANK_DIP ? BATTERY_CRANK : BATTERY_RUN
  return BATTERY_RUN
}

interface Output {
  vout: number
  iout: number
  limited: boolean
}

function buckOutput(vin: number, demand: number): Output {
  if (vin < BUCK_MIN_IN) return { vout: 0, iout: 0, limited: false }
  if (demand > BUCK_LIMIT) return { vout: 4.6, iout: BUCK_LIMIT, limited: true }
  return { vout: USB_VOLTS, iout: demand, limited: false }
}

function linearOutput(vin: number, demand: number): Output {
  const vout = Math.max(0, Math.min(5, vin - LINEAR_DROPOUT))
  if (vout < 4.5) return { vout, iout: 0, limited: false }
  if (demand > LINEAR_LIMIT) return { vout: 4.4, iout: LINEAR_LIMIT, limited: true }
  return { vout, iout: demand, limited: false }
}

export const demandOf = (p: ChargerParams): number => p.phones * p.phoneAmps

export function step(s: ChargerState, p: ChargerParams, dt: number): void {
  s.t += dt
  s.vbat = batteryVolts(p.car, s.t)
  const vin = Math.max(0, s.vbat - DIODE_DROP)
  const out = p.converter === BUCK ? buckOutput(vin, demandOf(p)) : linearOutput(vin, demandOf(p))
  const pout = out.vout * out.iout
  const iin = vin === 0 ? 0 : (p.converter === BUCK ? pout / (BUCK_EFFICIENCY * vin) : out.iout) + IDLE_AMPS
  s.vin = vin
  s.vout = out.vout
  s.iout = out.iout
  s.limited = out.limited
  s.iin = iin
  s.heat = p.converter === BUCK ? pout * (1 / BUCK_EFFICIENCY - 1) : (vin - out.vout) * out.iout
  s.diodeHeat = DIODE_DROP * iin
}

const fmtA = (a: number) => a.toFixed(2) + ' A'
const fmtW = (w: number) => w.toFixed(1) + ' W'

const CAR_TEXT: Record<number, string> = {
  [KEY_OFF]: 'المفتاح مقفول',
  [KEY_ACC]: 'كونتاكت (الموتور واقف)',
  [ENGINE_RUN]: 'الموتور دوّار',
  [CRANKING]: 'بتدوّر الموتور كل شوية'
}

function choice(key: keyof ChargerParams, label: string, options: number[], format: (v: number) => string, hint: (p: ChargerParams) => string): SimControl<ChargerParams> {
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

const controls: SimControl<ChargerParams>[] = [
  choice('car', 'العربية', [ENGINE_RUN, KEY_ACC, CRANKING, KEY_OFF], v => CAR_TEXT[v], p => (p.car === KEY_OFF ? 'الشاحن مطفي: مش بيسحب من البطارية' : 'البطارية ' + fmtV(batteryVolts(p.car, 3)))),
  choice('phones', 'عدد الموبايلات', [0, 1, 2], v => v + ' موبايل', p => 'المطلوب ' + fmtA(demandOf(p))),
  choice('phoneAmps', 'كل موبايل بيسحب', [0.5, 1, 1.5, 2.1], v => fmtA(v) + (v >= 2 ? ' (شحن سريع)' : ''), p => (demandOf(p) > BUCK_LIMIT ? 'أكتر من 3A: الموديول هيحدد' : 'في حدود الموديول')),
  choice('converter', 'المحوّل', [BUCK, LINEAR], v => (v === BUCK ? 'موديول Step-down (Buck)' : '7805 للمقارنة'), p => (p.converter === BUCK ? 'كفاءة حوالي 90%' : 'الفرق كله بيتحول حرارة'))
]

const NET_READINGS: Record<string, (s: ChargerState) => string> = {
  IN: s => fmtV(s.vbat),
  VP: s => fmtV(s.vin),
  GND: () => '0.00 V'
}

export const chargerSim: SimModel<ChargerParams, ChargerState> = {
  title: 'المحاكي: الشاحن في العربية',
  sub: 'اختار حالة العربية وعدد الموبايلات، وشوف الجهد على الـ USB والحرارة. وقارن الموديول بالـ 7805 عشان تعرف ليه مش بنستخدمه هنا.',
  note: 'الموديول بيحوّل 12V لـ 5V بكفاءة حوالي 90%، فبيسخن 1–2 وات بس. الـ 7805 بيرمي الفرق كله حرارة: مع موبايلين ممكن يوصل لأكتر من 10 وات.',
  footnote: 'الأرقام تقريبية: كل موبايل بيسحب حسب الشاحن والكابل ونسبة البطارية.',
  defaults,
  controls,
  traces: [
    { key: 'vbat', label: 'جهد البطارية (الفولتميتر)', color: '#ff5d5d', height: 70, max: 15, value: s => s.vbat, fill: true },
    { key: 'vout', label: 'جهد الـ USB', color: '#5aa9ff', height: 60, max: 6, value: s => s.vout, threshold: { value: 4.75, label: 'أقل من كده الموبايل مش بيشحن' } },
    { key: 'heat', label: 'حرارة المحوّل', color: '#ffb547', height: 60, max: 20, value: s => s.heat, fill: true }
  ],
  readouts: [
    { label: 'الفولتميتر', value: s => s.vbat.toFixed(1) + 'V' },
    { label: 'خرج الـ USB', value: s => fmtV(s.vout) },
    { label: 'تيار الموبايلات', value: s => fmtA(s.iout) + (s.limited ? ' (محدود)' : '') },
    { label: 'تيار من البطارية', value: s => fmtA(s.iin) },
    { label: 'حرارة المحوّل', value: s => fmtW(s.heat) },
    { label: 'حرارة الدايود', value: s => fmtW(s.diodeHeat) }
  ],
  init: () => ({ t: 0, vbat: 0, vin: 0, vout: 0, iout: 0, iin: 0, heat: 0, diodeHeat: 0, limited: false }),
  step,
  brightness: s => (s.vout >= 4.75 ? 1 : 0),
  netReading: (net, s) => (NET_READINGS[net] ?? (() => '—'))(s)
}

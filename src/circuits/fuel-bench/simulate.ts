import type { SimControl, SimModel } from '../../types/circuit'
import { fmtV } from '../../lib/format'
import {
  ADC_MAX, BENCH_PROFILE, FAULT_LATCHED, FAULT_NAMES, FAULT_NONE, FAULT_WATCHDOG, RUNNING, STATE_NAMES,
  begin, outputsOf, step as controllerStep, type Controller, type Inputs
} from './controller'

export const OFF = 0
export const ON = 1

export const PRESS_SHORT = 1
export const PRESS_LONG = 2

export const INJECT_NONE = 0
export const INJECT_SENSOR_OPEN = 1
export const INJECT_SENSOR_SHORT = 2
export const INJECT_RETURN_BLOCKED = 3
export const INJECT_LEAK = 4
export const INJECT_MOSFET_SHORT = 5
export const INJECT_LAMP_OPEN = 6
export const INJECT_FIRMWARE_HANG = 7

export interface FuelParams {
  power: number
  arm: number
  knob: number
  inject: number
  press: number
  pressSeq: number
}

export interface FuelState {
  t: number
  ctl: Controller
  mcuOn: boolean
  hungAtMs: number | null
  hangServed: boolean
  lastInject: number
  eeprom: number
  pressure: number
  sensorV: number
  knobV: number
  lpV: number
  drainV: number
  armV: number
  fbV: number
  lamp: number
  tickClock: number
  seenSeq: number
  buttonUntilMs: number
}

export const SUPPLY_V = 12
export const DIODE_DROP = 0.8
export const LOGIC_V = 5
export const DIVIDER_RATIO = 10 / (47 + 10)
export const SENSOR_ZERO_V = 0.5
export const SENSOR_SPAN_V = 4
export const PLANT_TAU_S = 0.4
export const WATCHDOG_MS = 250
export const TICK_S = 0.01
export const SHORT_PRESS_MS = 150
export const LONG_PRESS_MS = 2500

export const PLANT_GAIN: Record<number, number> = {
  [INJECT_RETURN_BLOCKED]: 1.25,
  [INJECT_LEAK]: 0.6
}

export const defaults: FuelParams = {
  power: ON,
  arm: ON,
  knob: 0,
  inject: INJECT_NONE,
  press: 0,
  pressSeq: 0
}

const toRaw = (volts: number): number => Math.round((Math.max(0, Math.min(LOGIC_V, volts)) / LOGIC_V) * ADC_MAX)
const nowMsOf = (s: FuelState): number => Math.round(s.t * 1000)

export function sensorVolts(pressure: number, inject: number): number {
  if (inject === INJECT_SENSOR_OPEN) return 0
  if (inject === INJECT_SENSOR_SHORT) return LOGIC_V
  return SENSOR_ZERO_V + (SENSOR_SPAN_V * pressure) / 100
}

const isMosfetShorted = (p: FuelParams) => p.inject === INJECT_MOSFET_SHORT
const hasLamp = (p: FuelParams) => p.inject !== INJECT_LAMP_OPEN

function dutyNow(s: FuelState): number {
  return s.mcuOn ? outputsOf(s.ctl).dutyPct : 0
}

function loadSide(s: FuelState, p: FuelParams): Pick<FuelState, 'lpV' | 'drainV' | 'armV' | 'fbV' | 'lamp'> {
  const powered = p.power === ON
  const lpV = powered && p.arm === ON ? SUPPLY_V - DIODE_DROP : 0
  const conducting = isMosfetShorted(p) ? 1 : dutyNow(s) / 100
  const lamp = hasLamp(p) && lpV > 0 ? conducting : 0
  const drainV = !hasLamp(p) || isMosfetShorted(p) ? 0 : lpV * (1 - conducting)
  return { lpV, drainV, armV: lpV * DIVIDER_RATIO, fbV: drainV * DIVIDER_RATIO, lamp }
}

function plantTarget(s: FuelState, p: FuelParams): number {
  const pumping = loadSide(s, p).lamp
  return Math.min(100, pumping * 100 * (PLANT_GAIN[p.inject] ?? 1))
}

function mcuInputs(s: FuelState, p: FuelParams): Inputs {
  return {
    nowMs: nowMsOf(s),
    sensorRaw: toRaw(s.sensorV),
    knobRaw: toRaw((LOGIC_V * p.knob) / 100),
    armRaw: toRaw(s.armV),
    drainRaw: toRaw(s.fbV),
    buttonDown: nowMsOf(s) < s.buttonUntilMs
  }
}

const bootedController = (s: FuelState, wasWatchdogReset: boolean): Controller =>
  begin(wasWatchdogReset ? FAULT_NONE : s.eeprom, wasWatchdogReset, BENCH_PROFILE, nowMsOf(s))

function pressButton(s: FuelState, p: FuelParams): Partial<FuelState> {
  if (p.pressSeq === s.seenSeq) return {}
  const holdMs = p.press === PRESS_LONG ? LONG_PRESS_MS : SHORT_PRESS_MS
  return { seenSeq: p.pressSeq, buttonUntilMs: nowMsOf(s) + holdMs }
}

function powerCycle(s: FuelState, p: FuelParams): Partial<FuelState> {
  if (p.power === OFF) return { mcuOn: false, hungAtMs: null }
  if (!s.mcuOn) return { mcuOn: true, ctl: bootedController(s, false), tickClock: 0 }
  return {}
}

function watchdog(s: FuelState, p: FuelParams): Partial<FuelState> {
  const injectChanged = p.inject !== s.lastInject
  const base = injectChanged ? { lastInject: p.inject, hangServed: false } : {}
  const served = injectChanged ? false : s.hangServed
  const shouldHang = p.inject === INJECT_FIRMWARE_HANG && !served && s.mcuOn && s.ctl.state === RUNNING
  if (s.hungAtMs === null) return shouldHang ? { ...base, hungAtMs: nowMsOf(s) } : base
  if (nowMsOf(s) - s.hungAtMs < WATCHDOG_MS) return base
  const rebooted = { ...s, eeprom: FAULT_WATCHDOG }
  return { ...base, hungAtMs: null, hangServed: true, eeprom: FAULT_WATCHDOG, ctl: bootedController(rebooted, true) }
}

function controllerTick(s: FuelState, p: FuelParams): Partial<FuelState> {
  if (!s.mcuOn || s.hungAtMs !== null) return {}
  const ctl = controllerStep(s.ctl, mcuInputs(s, p), BENCH_PROFILE)
  const latchedNow = ctl.state === FAULT_LATCHED && s.ctl.state !== FAULT_LATCHED
  const clearedNow = ctl.state !== FAULT_LATCHED && s.ctl.state === FAULT_LATCHED
  const eeprom = latchedNow ? ctl.fault : clearedNow ? FAULT_NONE : s.eeprom
  return { ctl, eeprom }
}

export function step(s: FuelState, p: FuelParams, dt: number): void {
  const timed = { ...s, t: s.t + dt, ...pressButton(s, p) }
  const powered = { ...timed, ...powerCycle(timed, p) }
  const guarded = { ...powered, ...watchdog(powered, p) }
  const target = plantTarget(guarded, p)
  const pressure = guarded.pressure + (target - guarded.pressure) * Math.min(1, dt / PLANT_TAU_S)
  const sensed = { ...guarded, pressure, sensorV: p.power === ON ? sensorVolts(pressure, p.inject) : 0, knobV: p.power === ON ? (LOGIC_V * p.knob) / 100 : 0 }
  const loaded = { ...sensed, ...loadSide(sensed, p) }
  const tickClock = loaded.tickClock + dt
  const ticked = tickClock >= TICK_S ? { ...loaded, tickClock: 0, ...controllerTick(loaded, p) } : { ...loaded, tickClock }
  Object.assign(s, ticked, loadSide(ticked, p))
}

export function init(): FuelState {
  return {
    t: 0, ctl: begin(FAULT_NONE, false, BENCH_PROFILE, 0), mcuOn: false, hungAtMs: null, hangServed: false, lastInject: INJECT_NONE,
    eeprom: FAULT_NONE, pressure: 0, sensorV: 0, knobV: 0, lpV: 0, drainV: 0, armV: 0, fbV: 0, lamp: 0, tickClock: 0, seenSeq: 0, buttonUntilMs: 0
  }
}

const fmtPct = (v: number): string => Math.round(v) + '%'

export const INJECT_TEXT: Record<number, string> = {
  [INJECT_NONE]: 'مفيش',
  [INJECT_SENSOR_OPEN]: 'سلك الحساس اتقطع',
  [INJECT_SENSOR_SHORT]: 'سلك الحساس لمس 5V',
  [INJECT_RETURN_BLOCKED]: 'الراجع مسدود (ضغط عالي)',
  [INJECT_LEAK]: 'تسريب (ضغط واطي)',
  [INJECT_MOSFET_SHORT]: 'الموسفت ضارب (قصر)',
  [INJECT_LAMP_OPEN]: 'اللمبة مفصولة',
  [INJECT_FIRMWARE_HANG]: 'الكود هنّج وهو شغال'
}

const INJECT_HINT: Record<number, string> = {
  [INJECT_NONE]: 'كل حاجة سليمة',
  [INJECT_SENSOR_OPEN]: 'R2 بيشد الدخل لـ 0V: عطل F1 في 100 ms',
  [INJECT_SENSOR_SHORT]: 'الدخل فوق 4.75V: عطل F2',
  [INJECT_RETURN_BLOCKED]: 'نفس الأمر بيطلّع ضغط أعلى: علّي المقبض وشوف F3',
  [INJECT_LEAK]: 'نفس الأمر بيطلّع ضغط أقل: بعد ثانيتين F4',
  [INJECT_MOSFET_SHORT]: 'اللمبة منوّرة غصب عنه: F5، والوحيد اللي يطفيها S1',
  [INJECT_LAMP_OPEN]: 'الـ Drain مش بيعلى: F5 قبل ما تبدأ',
  [INJECT_FIRMWARE_HANG]: 'دوس تشغيل: بعد 250 ms الـ Watchdog يعمل Reset وF6'
}

function choice(key: keyof FuelParams, label: string, options: number[], format: (v: number) => string, hint: (p: FuelParams) => string): SimControl<FuelParams> {
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

export const KNOB_STEPS = [0, 20, 40, 60, 80, 100]

const controls: SimControl<FuelParams>[] = [
  choice('power', 'الأدابتر', [ON, OFF], v => (v === ON ? 'متوصّل' : 'مفصول'), p => (p.power === ON ? 'الأردوينو شغال' : 'افصل وصّل: العطل المتسجّل بيرجع')),
  choice('arm', 'S1 (سويتش التشغيل)', [ON, OFF], v => (v === ON ? 'ON' : 'OFF'), p => (p.arm === ON ? 'اللمبة واخدة كهربا من S1' : 'S1 قاطع كهربا اللمبة بإيده، مهما الكود عمل')),
  choice('knob', 'المقبض (الأمر المطلوب)', KNOB_STEPS, v => v + '%', p => (p.knob <= BENCH_PROFILE.startKnobMaxPct ? 'على الصفر: مسموح تبدأ' : 'الخرج ' + Math.min(BENCH_PROFILE.maxDutyPct, Math.max(BENCH_PROFILE.minDutyPct, p.knob)) + '% (من 30 لـ 80)')),
  choice('inject', 'جرّب عطل', Object.keys(INJECT_TEXT).map(Number), v => INJECT_TEXT[v], p => INJECT_HINT[p.inject])
]

const NET_READINGS: Record<string, (s: FuelState, p: FuelParams) => string> = {
  IN: (_s, p) => fmtV(p.power === ON ? SUPPLY_V : 0),
  VP: (_s, p) => fmtV(p.power === ON ? SUPPLY_V - DIODE_DROP : 0),
  GND: () => '0.00 V',
  V5: s => fmtV(s.mcuOn ? LOGIC_V : 0),
  PRAW: s => fmtV(s.sensorV),
  SNS: s => fmtV(s.sensorV),
  KNB: s => fmtV(s.knobV),
  LP: s => fmtV(s.lpV),
  ARM: s => fmtV(s.armV),
  DRN: s => fmtV(s.drainV),
  FB: s => fmtV(s.fbV),
  PWM: s => fmtV((LOGIC_V * dutyNow(s)) / 100) + ' (متوسط)',
  GATE: s => fmtV((LOGIC_V * dutyNow(s)) / 100) + ' (متوسط)',
  RUN: s => fmtV(s.mcuOn && outputsOf(s.ctl).runLed ? LOGIC_V : 0),
  FLT: s => fmtV(s.mcuOn && outputsOf(s.ctl).faultLed ? LOGIC_V : 0),
  BTN: s => fmtV(s.mcuOn && nowMsOf(s) >= s.buttonUntilMs ? LOGIC_V : 0)
}

export const stateText = (s: FuelState): string => (s.mcuOn ? (s.hungAtMs !== null ? 'HUNG' : STATE_NAMES[s.ctl.state]) : 'OFF')

export const fuelSim: SimModel<FuelParams, FuelState> = {
  title: 'المحاكي: متحكم الطرمبة على المكتب',
  sub: 'نفس منطق الكود اللي على الأردوينو، سطر بسطر. المقبض بيطلب أمر، والمتحكم بيراقب الضغط وS1 وخرج الموسفت، وأي عطل يقفل الخرج ويفضل مقفول لحد Reset مقصود.',
  note: 'الطرمبة هنا لمبة، والضغط "نسبة من مدى الحساس" مش بار ولا PSI: مفيش أرقام بنزين حقيقية في الكيت ده. الضغط في المحاكي بيتبع الأمر بتأخير بسيط عشان تشوف الحدود بتشتغل.',
  footnote: 'آخر 3 ثواني: الضغط (والحد الأعلى 85%)، وأمر الخرج، ولمبة العطل.',
  defaults,
  controls,
  traces: [
    { key: 'pressure', label: 'الضغط (% من مدى الحساس)', color: '#5aa9ff', height: 70, max: 100, value: s => Math.max(0, Math.min(100, ((s.sensorV - SENSOR_ZERO_V) * 100) / SENSOR_SPAN_V)), fill: true, threshold: { value: BENCH_PROFILE.pressureHighPct, label: 'الحد الأعلى' } },
    { key: 'duty', label: 'أمر الخرج (PWM)', color: '#ffb547', height: 50, max: 100, value: s => dutyNow(s), fill: true },
    { key: 'fault', label: 'لمبة العطل', color: '#ff5d5d', height: 24, max: 1, value: s => (s.mcuOn && outputsOf(s.ctl).faultLed ? 1 : 0), fill: true }
  ],
  readouts: [
    { label: 'الحالة', value: s => stateText(s) },
    { label: 'العطل', value: s => (s.mcuOn && s.ctl.state === FAULT_LATCHED ? 'F' + s.ctl.fault + ' ' + FAULT_NAMES[s.ctl.fault] : '—') },
    { label: 'الضغط', value: s => (s.mcuOn ? fmtPct(s.ctl.pressurePct) : '—') },
    { label: 'المطلوب', value: (_s, p) => p.knob + '%' },
    { label: 'الخرج', value: s => dutyNow(s) + '%' },
    { label: 'الحساس', value: s => fmtV(s.sensorV) },
    { label: 'المتسجّل في EEPROM', value: s => (s.eeprom === FAULT_NONE ? 'مفيش' : 'F' + s.eeprom) },
    { label: 'اللمبة', value: s => (s.lamp > 0 ? '💡 ' + fmtPct(s.lamp * 100) : 'مطفية') }
  ],
  init,
  step,
  brightness: s => s.lamp,
  netReading: (net, s, p) => (NET_READINGS[net] ?? (() => '—'))(s, p)
}

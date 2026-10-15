import type { SimControl, SimModel } from '../../types/circuit'
import { fmtV } from '../../lib/format'
import {
  CMD_CLOSE, CMD_NONE, CMD_OPEN, CMD_STOP, FULL_TURNS, MIN_RUN_V, STALL_AMPS, STATE_NAMES,
  begin, driveOf, step as controllerStep, type Controller
} from './controller'

export const FAULT_NONE = 0
export const FAULT_JAM = 1
export const FAULT_HALL_DEAD = 2
export const FAULT_HOME_DEAD = 3

export const MOTOR_RPM = 40
export const TURNS_PER_S = MOTOR_RPM / 60
export const RUN_AMPS = 3
export const STRAP_AMPS = 1
export const BLOCKED_AMPS = 9
export const STANDBY_AMPS = 0.028
export const LVD_CUT_V = 11.8
export const JAM_AT_TURNS = 3
export const HOME_ZONE_TURNS = 0.02
export const TIGHT_TURNS = FULL_TURNS + 1

export interface CoverParams {
  target: number
  battery: number
  fault: number
  lampName: string
  lampGlow: string
}

export interface CoverState {
  t: number
  ctl: Controller
  lastTarget: number
  position: number
  powered: boolean
  motorAmps: number
  standbyAmps: number
  stallSeconds: number
}

export const defaults: CoverParams = {
  target: CMD_CLOSE,
  battery: 12.6,
  fault: FAULT_NONE,
  lampName: 'الموتور',
  lampGlow: '#ffb547'
}

const isBlocked = (position: number, drive: number, fault: number): boolean =>
  drive > 0 && (position >= TIGHT_TURNS || (fault === FAULT_JAM && position >= JAM_AT_TURNS))

const atHomeOf = (position: number, fault: number): boolean => fault !== FAULT_HOME_DEAD && position <= HOME_ZONE_TURNS

function hallPulses(from: number, to: number, fault: number): number {
  return fault === FAULT_HALL_DEAD ? 0 : Math.abs(Math.floor(to) - Math.floor(from))
}

function motorAmpsOf(drive: number, blocked: boolean): number {
  if (drive === 0) return 0
  if (blocked) return BLOCKED_AMPS
  return drive < 0 ? RUN_AMPS + STRAP_AMPS : RUN_AMPS
}

function powerOff(s: CoverState): void {
  s.powered = false
  s.motorAmps = 0
  s.standbyAmps = 0
}

export function step(s: CoverState, p: CoverParams, dt: number): void {
  s.t += dt
  if (p.battery < LVD_CUT_V) return powerOff(s)
  s.powered = true
  const drive = driveOf(s.ctl)
  const blocked = isBlocked(s.position, drive, p.fault)
  const next = blocked ? s.position : s.position + drive * TURNS_PER_S * dt
  s.motorAmps = motorAmpsOf(drive, blocked)
  s.stallSeconds += blocked ? dt : 0
  const cmd = p.target === s.lastTarget ? CMD_NONE : p.target
  s.lastTarget = p.target
  s.ctl = controllerStep(s.ctl, {
    nowMs: Math.round(s.t * 1000),
    cmd,
    pulses: hallPulses(s.position, next, p.fault),
    atHome: atHomeOf(next, p.fault),
    motorAmps: s.motorAmps,
    batteryV: p.battery
  })
  s.position = next
  if (driveOf(s.ctl) === 0) s.motorAmps = 0
  s.standbyAmps = s.motorAmps > 0 ? 0 : STANDBY_AMPS
}

export const openPct = (s: CoverState): number => Math.max(0, Math.min(100, (s.position / FULL_TURNS) * 100))

const TARGET_TEXT: Record<number, string> = { [CMD_OPEN]: '▲ افرد', [CMD_CLOSE]: '▼ لِف', [CMD_STOP]: '■ وقّف' }
const FAULT_TEXT: Record<number, string> = {
  [FAULT_NONE]: 'من غير عطل',
  [FAULT_JAM]: 'الغطا اتزنق',
  [FAULT_HALL_DEAD]: 'حساس اللفات فاصل',
  [FAULT_HOME_DEAD]: 'سويتش القفل فاصل'
}

function choice(key: 'target' | 'battery' | 'fault', label: string, options: number[], format: (v: number) => string, hint: (p: CoverParams) => string): SimControl<CoverParams> {
  return {
    key,
    label,
    options,
    format,
    get: p => p[key],
    set: (p, v) => ({ ...p, [key]: v }),
    hint,
    isDefault: v => v === defaults[key]
  }
}

function batteryHint(p: CoverParams): string {
  if (p.battery < LVD_CUT_V) return 'موديول الحماية فاصل كل حاجة: صفر سحب'
  if (p.battery < MIN_RUN_V) return 'الكود رافض يحرّك الموتور عشان العربية تدوّر'
  return 'البطارية كويسة'
}

const controls: SimControl<CoverParams>[] = [
  choice('target', 'الريموت', [CMD_OPEN, CMD_CLOSE, CMD_STOP], v => TARGET_TEXT[v], () => 'زرار A يفرد، B يلف، C يوقّف'),
  choice('battery', 'جهد البطارية', [12.6, 12.2, 11.9, 11.5], v => v.toFixed(1) + 'V', batteryHint),
  choice('fault', 'جرّب عطل', [FAULT_NONE, FAULT_JAM, FAULT_HALL_DEAD, FAULT_HOME_DEAD], v => FAULT_TEXT[v], p => (p.fault === FAULT_NONE ? 'كل حاجة سليمة' : 'شوف الكود بيوقّف الموتور إزاي'))
]

const fmtA = (a: number) => a.toFixed(1) + ' A'

export const stateText = (s: CoverState): string => (s.powered ? STATE_NAMES[s.ctl.mode] : 'مفصول (البطارية تحت 11.8V)')

export const coverSim: SimModel<CoverParams, CoverState> = {
  title: 'المحاكي: الغطا على العربية',
  sub: 'دوس على زراير الريموت، وغيّر جهد البطارية، وجرّب الأعطال: شوف الأردوينو بيعد اللفات وبيوقّف الموتور فين.',
  note: 'الأردوينو بيعد لفات الأسطوانة بحساس Hall ومغناطيس: 8 لفات = الغطا مفرود. وهو بيلف بيقف على سويتش القفل. لو التيار عدّى 6A (الموتور اتزنق) أو مفيش لفة اتعدت في 3 ثواني، بيوقّف فوراً.',
  footnote: 'الأرقام تقريبية: التيار والسرعة بيختلفوا حسب الموتور وشد الأستك ووزن القماش.',
  defaults,
  controls,
  traces: [
    { key: 'pos', label: 'الغطا مفرود %', color: '#5aa9ff', height: 70, max: 100, value: openPct, fill: true },
    { key: 'amps', label: 'تيار الموتور', color: '#ffb547', height: 60, max: 10, value: s => s.motorAmps, threshold: { value: STALL_AMPS, label: 'فوق كده = زنقة' } }
  ],
  readouts: [
    { label: 'الحالة', value: stateText },
    { label: 'اللفات المعدودة', value: s => s.ctl.turns + ' / ' + FULL_TURNS },
    { label: 'الغطا مفرود', value: s => Math.round(openPct(s)) + '%' },
    { label: 'تيار الموتور', value: s => fmtA(s.motorAmps) },
    { label: 'سحب وهي راكنة', value: s => Math.round(s.standbyAmps * 1000) + ' mA' },
    { label: 'في اليوم', value: s => (s.standbyAmps * 24).toFixed(2) + ' Ah' }
  ],
  init: () => ({ t: 0, ctl: begin(0), lastTarget: CMD_NONE, position: 0, powered: true, motorAmps: 0, standbyAmps: STANDBY_AMPS, stallSeconds: 0 }),
  step,
  brightness: s => (s.motorAmps > 0 ? 1 : 0),
  netReading: (net, s, p) => (net === 'BAT' ? fmtV(p.battery) : net === 'GND' ? '0.00 V' : s.powered ? '—' : '0.00 V')
}

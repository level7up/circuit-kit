export const DISABLED = 0
export const SELF_TEST = 1
export const READY = 2
export const RUNNING = 3
export const FAULT_LATCHED = 4

export const FAULT_NONE = 0
export const FAULT_SENSOR_OPEN = 1
export const FAULT_SENSOR_SHORT = 2
export const FAULT_OVER_PRESSURE = 3
export const FAULT_UNDER_PRESSURE = 4
export const FAULT_OUTPUT = 5
export const FAULT_WATCHDOG = 6
export const FAULT_BAD_PROFILE = 7

export const ADC_MAX = 1023

export interface Profile {
  name: string
  sensorOpenBelow: number
  sensorShortAbove: number
  sensorZero: number
  sensorSpan: number
  pressureLowPct: number
  pressureHighPct: number
  minDutyPct: number
  maxDutyPct: number
  startKnobMaxPct: number
  armOnAbove: number
  drainHighAbove: number
  selfTestMs: number
  primeMs: number
  faultPersistMs: number
  resetHoldMs: number
  debounceMs: number
}

export const BENCH_PROFILE: Profile = {
  name: 'BENCH-SIM',
  sensorOpenBelow: 51,
  sensorShortAbove: 972,
  sensorZero: 102,
  sensorSpan: 819,
  pressureLowPct: 25,
  pressureHighPct: 85,
  minDutyPct: 30,
  maxDutyPct: 80,
  startKnobMaxPct: 5,
  armOnAbove: 200,
  drainHighAbove: 200,
  selfTestMs: 1000,
  primeMs: 2000,
  faultPersistMs: 100,
  resetHoldMs: 2000,
  debounceMs: 30
}

export interface Inputs {
  nowMs: number
  sensorRaw: number
  knobRaw: number
  armRaw: number
  drainRaw: number
  buttonDown: boolean
}

export interface Timers {
  open: number | null
  short: number | null
  over: number | null
  under: number | null
  output: number | null
  armOff: number | null
}

export interface Controller {
  state: number
  fault: number
  stateSinceMs: number
  sensorFiltered: number
  pressurePct: number
  requestPct: number
  dutyPct: number
  buttonDown: boolean
  buttonSinceMs: number
  longPressUsed: boolean
  hasSample: boolean
  timers: Timers
}

export interface Outputs {
  dutyPct: number
  runLed: boolean
  faultLed: boolean
}

const NO_TIMERS: Timers = { open: null, short: null, over: null, under: null, output: null, armOff: null }

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function isProfileValid(p: Profile): boolean {
  return p.sensorOpenBelow < p.sensorZero &&
    p.sensorZero + p.sensorSpan <= p.sensorShortAbove &&
    p.sensorShortAbove <= ADC_MAX &&
    p.sensorSpan > 0 &&
    p.pressureLowPct < p.pressureHighPct &&
    p.pressureHighPct <= 100 &&
    p.minDutyPct <= p.maxDutyPct &&
    p.maxDutyPct <= 100 &&
    p.startKnobMaxPct < p.minDutyPct &&
    p.resetHoldMs > p.debounceMs
}

export const pressurePctOf = (raw: number, p: Profile): number =>
  clamp(Math.round(((raw - p.sensorZero) * 100) / p.sensorSpan), 0, 100)

export const knobPctOf = (raw: number): number => clamp(Math.round((raw * 100) / ADC_MAX), 0, 100)

const fresh = (state: number, fault: number, nowMs: number): Controller => ({
  state,
  fault,
  stateSinceMs: nowMs,
  sensorFiltered: 0,
  pressurePct: 0,
  requestPct: 0,
  dutyPct: 0,
  buttonDown: false,
  buttonSinceMs: nowMs,
  longPressUsed: false,
  hasSample: false,
  timers: NO_TIMERS
})

export function begin(storedFault: number, wasWatchdogReset: boolean, p: Profile, nowMs: number): Controller {
  if (!isProfileValid(p)) return fresh(FAULT_LATCHED, FAULT_BAD_PROFILE, nowMs)
  if (wasWatchdogReset) return fresh(FAULT_LATCHED, FAULT_WATCHDOG, nowMs)
  if (storedFault !== FAULT_NONE) return fresh(FAULT_LATCHED, storedFault, nowMs)
  return fresh(DISABLED, FAULT_NONE, nowMs)
}

const since = (active: boolean, prev: number | null, nowMs: number): number | null =>
  active ? prev ?? nowMs : null

const lasted = (start: number | null, nowMs: number, ms: number): boolean => start !== null && nowMs - start >= ms

interface Press {
  short: boolean
  long: boolean
}

interface ButtonState {
  buttonDown: boolean
  buttonSinceMs: number
  longPressUsed: boolean
  press: Press
}

function readButton(c: Controller, i: Inputs, p: Profile): ButtonState {
  if (i.buttonDown !== c.buttonDown) {
    const heldMs = i.nowMs - c.buttonSinceMs
    const isRelease = !i.buttonDown
    const short = isRelease && heldMs >= p.debounceMs && heldMs < p.resetHoldMs && !c.longPressUsed
    return { buttonDown: i.buttonDown, buttonSinceMs: i.nowMs, longPressUsed: false, press: { short, long: false } }
  }
  const long = c.buttonDown && !c.longPressUsed && i.nowMs - c.buttonSinceMs >= p.resetHoldMs
  return { buttonDown: c.buttonDown, buttonSinceMs: c.buttonSinceMs, longPressUsed: c.longPressUsed || long, press: { short: false, long } }
}

function nextTimers(c: Controller, i: Inputs, pressurePct: number, p: Profile): Timers {
  const t = c.timers
  const armOn = i.armRaw >= p.armOnAbove
  const primed = c.state === RUNNING && i.nowMs - c.stateSinceMs >= p.primeMs
  const outputWatched = c.state === SELF_TEST || c.state === READY
  return {
    open: since(i.sensorRaw < p.sensorOpenBelow, t.open, i.nowMs),
    short: since(i.sensorRaw > p.sensorShortAbove, t.short, i.nowMs),
    over: since(pressurePct > p.pressureHighPct, t.over, i.nowMs),
    under: since(primed && pressurePct < p.pressureLowPct, t.under, i.nowMs),
    output: since(outputWatched && armOn && i.drainRaw < p.drainHighAbove, t.output, i.nowMs),
    armOff: since(!armOn, t.armOff, i.nowMs)
  }
}

function detectFault(t: Timers, nowMs: number, p: Profile): number {
  const order: [number | null, number][] = [
    [t.open, FAULT_SENSOR_OPEN],
    [t.short, FAULT_SENSOR_SHORT],
    [t.over, FAULT_OVER_PRESSURE],
    [t.under, FAULT_UNDER_PRESSURE],
    [t.output, FAULT_OUTPUT]
  ]
  return order.find(([start]) => lasted(start, nowMs, p.faultPersistMs))?.[1] ?? FAULT_NONE
}

function canClear(c: Controller, i: Inputs, p: Profile): boolean {
  const sensorOk = i.sensorRaw >= p.sensorOpenBelow && i.sensorRaw <= p.sensorShortAbove
  return c.fault !== FAULT_BAD_PROFILE && sensorOk && c.pressurePct <= p.pressureHighPct && knobPctOf(i.knobRaw) <= p.startKnobMaxPct
}

function canStart(i: Inputs, p: Profile): boolean {
  return i.armRaw >= p.armOnAbove && i.drainRaw >= p.drainHighAbove && knobPctOf(i.knobRaw) <= p.startKnobMaxPct
}

const enter = (c: Controller, state: number, nowMs: number): Controller =>
  ({ ...c, state, stateSinceMs: nowMs, dutyPct: 0, timers: NO_TIMERS })

function nextState(c: Controller, i: Inputs, press: Press, p: Profile): Controller {
  if (c.state === FAULT_LATCHED) {
    return press.long && canClear(c, i, p) ? { ...enter(c, SELF_TEST, i.nowMs), fault: FAULT_NONE } : { ...c, dutyPct: 0 }
  }
  const fault = c.state === DISABLED ? FAULT_NONE : detectFault(c.timers, i.nowMs, p)
  if (fault !== FAULT_NONE) return { ...enter(c, FAULT_LATCHED, i.nowMs), fault }
  switch (c.state) {
    case DISABLED:
      return enter(c, SELF_TEST, i.nowMs)
    case SELF_TEST:
      return i.nowMs - c.stateSinceMs >= p.selfTestMs ? enter(c, READY, i.nowMs) : { ...c, dutyPct: 0 }
    case READY:
      return press.short && canStart(i, p) ? { ...enter(c, RUNNING, i.nowMs), dutyPct: clamp(c.requestPct, p.minDutyPct, p.maxDutyPct) } : { ...c, dutyPct: 0 }
    default:
      if (press.short || lasted(c.timers.armOff, i.nowMs, p.faultPersistMs)) return enter(c, READY, i.nowMs)
      return { ...c, dutyPct: clamp(c.requestPct, p.minDutyPct, p.maxDutyPct) }
  }
}

export function step(c: Controller, i: Inputs, p: Profile): Controller {
  const button = readButton(c, i, p)
  const filtered = !c.hasSample ? i.sensorRaw : Math.round((c.sensorFiltered * 3 + i.sensorRaw) / 4)
  const pressurePct = pressurePctOf(filtered, p)
  const measured: Controller = {
    ...c,
    sensorFiltered: filtered,
    pressurePct,
    requestPct: knobPctOf(i.knobRaw),
    buttonDown: button.buttonDown,
    buttonSinceMs: button.buttonSinceMs,
    longPressUsed: button.longPressUsed,
    hasSample: true,
    timers: c.state === FAULT_LATCHED ? NO_TIMERS : nextTimers(c, i, pressurePct, p)
  }
  return nextState(measured, i, button.press, p)
}

export const outputsOf = (c: Controller): Outputs => ({
  dutyPct: c.state === RUNNING ? c.dutyPct : 0,
  runLed: c.state === RUNNING,
  faultLed: c.state === FAULT_LATCHED
})

export const STATE_NAMES: Record<number, string> = {
  [DISABLED]: 'DISABLED',
  [SELF_TEST]: 'SELF TEST',
  [READY]: 'READY',
  [RUNNING]: 'RUNNING',
  [FAULT_LATCHED]: 'FAULT'
}

export const FAULT_NAMES: Record<number, string> = {
  [FAULT_NONE]: 'NONE',
  [FAULT_SENSOR_OPEN]: 'SENSOR OPEN',
  [FAULT_SENSOR_SHORT]: 'SENSOR SHORT',
  [FAULT_OVER_PRESSURE]: 'OVER PRESS',
  [FAULT_UNDER_PRESSURE]: 'UNDER PRESS',
  [FAULT_OUTPUT]: 'OUTPUT FAULT',
  [FAULT_WATCHDOG]: 'WATCHDOG',
  [FAULT_BAD_PROFILE]: 'BAD PROFILE'
}

const pad = (text: string, width: number): string => (text + ' '.repeat(width)).slice(0, width)
const pct = (v: number): string => (String(v) + '%').padStart(4, ' ')

export function lcdLines(c: Controller): [string, string] {
  const top = pad(STATE_NAMES[c.state], 11) + 'P' + pct(c.pressurePct)
  if (c.state === FAULT_LATCHED) return [pad(top, 16), pad('F' + c.fault + ' ' + FAULT_NAMES[c.fault], 16)]
  return [pad(top, 16), pad('REQ' + pct(c.requestPct) + ' OUT' + pct(outputsOf(c).dutyPct), 16)]
}

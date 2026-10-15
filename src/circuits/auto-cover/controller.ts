export const CLOSED = 0
export const OPENING = 1
export const OPEN = 2
export const CLOSING = 3
export const PAUSED = 4
export const STALLED = 5
export const SENSOR_LOST = 6
export const LOW_BATTERY = 7

export const CMD_NONE = 0
export const CMD_OPEN = 1
export const CMD_CLOSE = 2
export const CMD_STOP = 3

export const FULL_TURNS = 8
export const HOME_OVERRUN_TURNS = 1
export const PULSE_TIMEOUT_MS = 3000
export const INRUSH_MS = 300
export const STALL_AMPS = 6
export const MIN_RUN_V = 12

export type Drive = -1 | 0 | 1

export interface Controller {
  mode: number
  turns: number
  moveStartMs: number
  lastPulseMs: number
}

export interface Inputs {
  nowMs: number
  cmd: number
  pulses: number
  atHome: boolean
  motorAmps: number
  batteryV: number
}

export const STATE_NAMES: Record<number, string> = {
  [CLOSED]: 'مقفول (الغطا ملفوف)',
  [OPENING]: 'بيفرد الغطا',
  [OPEN]: 'مفرود على العربية',
  [CLOSING]: 'بيلف الغطا',
  [PAUSED]: 'واقف في النص',
  [STALLED]: 'عطل: الموتور اتزنق',
  [SENSOR_LOST]: 'عطل: حساس مش بيقرا',
  [LOW_BATTERY]: 'البطارية ضعيفة: مش هيتحرك'
}

export const FAULTS = new Set([STALLED, SENSOR_LOST, LOW_BATTERY])

export const begin = (nowMs: number): Controller => ({ mode: CLOSED, turns: 0, moveStartMs: nowMs, lastPulseMs: nowMs })

export const driveOf = (c: Controller): Drive => (c.mode === OPENING ? 1 : c.mode === CLOSING ? -1 : 0)

const isMoving = (c: Controller): boolean => driveOf(c) !== 0

function startMove(c: Controller, mode: number, nowMs: number): Controller {
  return { ...c, mode, moveStartMs: nowMs, lastPulseMs: nowMs }
}

function applyCommand(c: Controller, i: Inputs): Controller {
  if (i.cmd === CMD_STOP) return isMoving(c) ? { ...c, mode: PAUSED } : c
  if (i.cmd !== CMD_OPEN && i.cmd !== CMD_CLOSE) return c
  if (i.batteryV < MIN_RUN_V) return { ...c, mode: LOW_BATTERY }
  if (i.cmd === CMD_OPEN) return c.turns >= FULL_TURNS ? { ...c, mode: OPEN } : startMove(c, OPENING, i.nowMs)
  return i.atHome ? { ...c, mode: CLOSED, turns: 0 } : startMove(c, CLOSING, i.nowMs)
}

function countPulses(c: Controller, i: Inputs): Controller {
  if (i.pulses === 0) return c
  return { ...c, turns: c.turns + driveOf(c) * i.pulses, lastPulseMs: i.nowMs }
}

function checkFaults(c: Controller, i: Inputs): Controller {
  const pastInrush = i.nowMs - c.moveStartMs > INRUSH_MS
  if (pastInrush && i.motorAmps > STALL_AMPS) return { ...c, mode: STALLED }
  if (i.nowMs - c.lastPulseMs > PULSE_TIMEOUT_MS) return { ...c, mode: SENSOR_LOST }
  if (c.turns <= -HOME_OVERRUN_TURNS) return { ...c, mode: SENSOR_LOST }
  return c
}

function checkEnds(c: Controller, i: Inputs): Controller {
  if (c.mode === OPENING && c.turns >= FULL_TURNS) return { ...c, mode: OPEN }
  if (c.mode === CLOSING && i.atHome) return { ...c, mode: CLOSED, turns: 0 }
  return c
}

export function step(c: Controller, i: Inputs): Controller {
  const commanded = applyCommand(c, i)
  if (!isMoving(commanded)) return commanded
  const moved = checkEnds(countPulses(commanded, i), i)
  return isMoving(moved) ? checkFaults(moved, i) : moved
}

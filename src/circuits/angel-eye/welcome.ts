export const WELCOME_OFF = 0
export const WELCOME_ON = 1
export const LOCKED = 0
export const UNLOCKED = 1

export const WELCOME_C = 100e-6
export const WELCOME_R = 56e3
export const WELCOME_R_OPTIONS = [22e3, 33e3, 56e3, 100e3]
export const TRIGGER_OHMS = 1e3
export const LOCK_PULSE = 0.3
export const SCHMITT_LOW = 0.39
export const SCHMITT_HIGH = 0.59

export interface WelcomeState {
  lastLock: number
  pulse: number
  vt: number
  on: boolean
}

export interface WelcomeInput {
  enabled: boolean
  lock: number
  R: number
  vdd: number
}

export const welcomeInit = (lock: number): WelcomeState => ({ lastLock: lock, pulse: 0, vt: 0, on: false })

export const welcomePeak = (R: number, vdd: number): number => (vdd * R) / (R + TRIGGER_OHMS)

export const welcomeSeconds = (R: number, vdd: number): number =>
  R * WELCOME_C * Math.log(welcomePeak(R, vdd) / (SCHMITT_LOW * vdd))

const chargeTau = (R: number): number => ((R * TRIGGER_OHMS) / (R + TRIGGER_OHMS)) * WELCOME_C

function nextVoltage(w: WelcomeState, input: WelcomeInput, dt: number): number {
  if (w.pulse > 0) return welcomePeak(input.R, input.vdd) + (w.vt - welcomePeak(input.R, input.vdd)) * Math.exp(-dt / chargeTau(input.R))
  return w.vt * Math.exp(-dt / (input.R * WELCOME_C))
}

function isGateOn(vt: number, wasOn: boolean, vdd: number): boolean {
  if (wasOn) return vt > SCHMITT_LOW * vdd
  return vt > SCHMITT_HIGH * vdd
}

export function welcomeStep(w: WelcomeState, input: WelcomeInput, dt: number): void {
  const changed = input.lock !== w.lastLock
  w.lastLock = input.lock
  if (changed && input.enabled) w.pulse = LOCK_PULSE
  w.vt = input.enabled ? nextVoltage(w, input, dt) : 0
  w.pulse = Math.max(0, w.pulse - dt)
  w.on = input.enabled && input.vdd > 0 && isGateOn(w.vt, w.on, input.vdd)
}

export const welcomeLeft = (w: WelcomeState, input: WelcomeInput): number =>
  w.on ? Math.max(0, input.R * WELCOME_C * Math.log(w.vt / (SCHMITT_LOW * input.vdd))) : 0

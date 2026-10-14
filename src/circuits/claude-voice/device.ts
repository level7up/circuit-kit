export const DEBOUNCE_MS = 25
export const HOST_TIMEOUT_MS = 3000
export const MAX_LINE_CHARS = 24
export const FAST_BLINK_MS = 125
export const SLOW_BLINK_MS = 500
export const ERROR_PERIOD_MS = 1000
export const FLASH_MS = 100
export const NO_HOST_PERIOD_MS = 2000
export const NO_HOST_BLIP_MS = 60

export const LINE_PTT_DOWN = 'BTN:PTT_DOWN'
export const LINE_PTT_UP = 'BTN:PTT_UP'
export const LINE_CANCEL = 'BTN:CANCEL'
export const LINE_READY = 'DEV:READY'

export const EVENT_NONE = 0
export const EVENT_DOWN = 1
export const EVENT_UP = 2

export const HOST_UNKNOWN = -1
export const HOST_IDLE = 0
export const HOST_LISTENING = 1
export const HOST_PROCESSING = 2
export const HOST_SPEAKING = 3
export const HOST_ERROR = 4

export const STATE_LINES = ['STATE:IDLE', 'STATE:LISTENING', 'STATE:PROCESSING', 'STATE:SPEAKING', 'STATE:ERROR']
const STATE_LABELS = ['READY', 'LISTENING', 'THINKING', 'SPEAKING', 'ERROR']

export interface Debounce {
  stable: boolean
  raw: boolean
  changedAtMs: number
}

export interface DebounceStep {
  next: Debounce
  event: number
}

export const releasedButton = (nowMs: number): Debounce => ({ stable: false, raw: false, changedAtMs: nowMs })

export function debounce(d: Debounce, rawDown: boolean, nowMs: number): DebounceStep {
  if (rawDown !== d.raw) return { next: { stable: d.stable, raw: rawDown, changedAtMs: nowMs }, event: EVENT_NONE }
  if (rawDown === d.stable || nowMs - d.changedAtMs < DEBOUNCE_MS) return { next: d, event: EVENT_NONE }
  return { next: { stable: rawDown, raw: rawDown, changedAtMs: d.changedAtMs }, event: rawDown ? EVENT_DOWN : EVENT_UP }
}

export interface LineReader {
  buf: string
  rejected: boolean
  done: boolean
}

export const FEED_PENDING = 0
export const FEED_LINE = 1
export const FEED_REJECTED = 2

export interface FeedStep {
  next: LineReader
  result: number
}

export const emptyReader = (): LineReader => ({ buf: '', rejected: false, done: false })

const isPrintable = (c: string): boolean => c >= ' ' && c <= '~'

function endLine(r: LineReader): FeedStep {
  if (r.rejected || r.buf.length === 0) return { next: emptyReader(), result: r.rejected ? FEED_REJECTED : FEED_PENDING }
  return { next: { ...r, done: true }, result: FEED_LINE }
}

export function feed(current: LineReader, c: string): FeedStep {
  const r = current.done ? emptyReader() : current
  if (c === '\r') return { next: r, result: FEED_PENDING }
  if (c === '\n') return endLine(r)
  if (r.rejected) return { next: r, result: FEED_PENDING }
  if (!isPrintable(c) || r.buf.length >= MAX_LINE_CHARS) return { next: { ...r, rejected: true }, result: FEED_PENDING }
  return { next: { ...r, buf: r.buf + c }, result: FEED_PENDING }
}

export function parseStateLine(line: string): number {
  const i = STATE_LINES.indexOf(line)
  return i < 0 ? HOST_UNKNOWN : i
}

export const shownState = (last: number, lastAtMs: number, nowMs: number): number =>
  nowMs - lastAtMs > HOST_TIMEOUT_MS ? HOST_UNKNOWN : last

const isBlinkOn = (nowMs: number, halfPeriodMs: number): boolean => Math.floor(nowMs / halfPeriodMs) % 2 === 0

function isErrorFlashOn(nowMs: number): boolean {
  const phase = nowMs % ERROR_PERIOD_MS
  return phase < FLASH_MS || (phase >= 2 * FLASH_MS && phase < 3 * FLASH_MS)
}

export function ledOn(s: number, nowMs: number): boolean {
  if (s === HOST_IDLE) return false
  if (s === HOST_LISTENING) return true
  if (s === HOST_PROCESSING) return isBlinkOn(nowMs, FAST_BLINK_MS)
  if (s === HOST_SPEAKING) return isBlinkOn(nowMs, SLOW_BLINK_MS)
  if (s === HOST_ERROR) return isErrorFlashOn(nowMs)
  return nowMs % NO_HOST_PERIOD_MS < NO_HOST_BLIP_MS
}

export const stateLabel = (s: number): string => (s === HOST_UNKNOWN ? 'NO HOST' : STATE_LABELS[s])

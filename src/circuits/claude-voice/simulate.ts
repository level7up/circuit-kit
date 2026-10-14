import type { SimControl, SimModel } from '../../types/circuit'
import {
  EVENT_DOWN, EVENT_UP, FEED_LINE, FEED_REJECTED, HOST_UNKNOWN, LINE_CANCEL, LINE_PTT_DOWN, LINE_PTT_UP, LINE_READY, STATE_LINES,
  debounce, emptyReader, feed, ledOn, parseStateLine, releasedButton, shownState, stateLabel, type Debounce, type LineReader
} from './device'
import { SETTLE_MS, transition, wireStateOf, type HostAction, type HostEvent, type HostState } from './host'

export const OFF = 0
export const ON = 1

export const INJECT_NONE = 0
export const INJECT_BOUNCE = 1
export const INJECT_SILENCE = 2
export const INJECT_CLAUDE_FAIL = 3
export const INJECT_SERIAL_NOISE = 4
export const INJECT_LONG_REPLY = 5

export const BOUNCE_MS = 12
export const CANCEL_PRESS_MS = 120
export const TRANSCRIBE_MS = 800
export const PROCESS_MS = 2500
export const SPEAK_MS_PER_CHAR = 25
export const MAX_SPOKEN_CHARS = 600
export const HEARTBEAT_MS = 1000
export const NOISE_EVERY_MS = 1500
export const SERIAL_LOG_LINES = 7

export const HEARD_TEXT = 'what does the step function in simulate.ts do?'
export const REPLY_TEXT = 'It advances the simulation by one millisecond: it reads the buttons, runs the host state machine and updates the LED.'
export const LONG_REPLY_TEXT = (REPLY_TEXT + ' ').repeat(12).trim()

const DEVICE_NOISE = 'BTN:PTT_D0WN'
const HOST_NOISE = 'STATE:\u0001\u0002' + 'x'.repeat(30)

export interface VoiceParams {
  usb: number
  app: number
  ptt: number
  cancelSeq: number
  inject: number
}

export interface SerialLine {
  up: boolean
  text: string
  ok: boolean
}

export interface VoiceState {
  t: number
  devOn: boolean
  rawPtt: boolean
  rawCancel: boolean
  ptt: Debounce
  cancel: Debounce
  reader: LineReader
  lastHost: number
  lastHostMs: number
  led: boolean
  host: HostState
  hostSinceMs: number
  jobDoneMs: number | null
  turns: number
  heard: string
  reply: string
  spokenChars: number
  serial: SerialLine[]
  rejected: number
  lastHeartbeatMs: number
  nextNoiseMs: number
  pttSeenAtMs: number
  lastPtt: number
  seenCancelSeq: number
  cancelUntilMs: number
}

export const defaults: VoiceParams = { usb: ON, app: ON, ptt: OFF, cancelSeq: 0, inject: INJECT_NONE }

export function init(): VoiceState {
  return {
    t: 0, devOn: false, rawPtt: false, rawCancel: false, ptt: releasedButton(0), cancel: releasedButton(0), reader: emptyReader(),
    lastHost: HOST_UNKNOWN, lastHostMs: 0, led: false, host: 'IDLE', hostSinceMs: 0, jobDoneMs: null, turns: 0, heard: '', reply: '',
    spokenChars: 0, serial: [], rejected: 0, lastHeartbeatMs: 0, nextNoiseMs: 0, pttSeenAtMs: 0, lastPtt: OFF, seenCancelSeq: 0, cancelUntilMs: 0
  }
}

const isLinked = (p: VoiceParams): boolean => p.usb === ON && p.app === ON

const logged = (s: VoiceState, line: SerialLine): VoiceState => ({ ...s, serial: [...s.serial, line].slice(-SERIAL_LOG_LINES) })

function deviceHears(s: VoiceState, text: string, nowMs: number): VoiceState {
  let reader = s.reader
  let next = s
  for (const c of text + '\n') {
    const fed = feed(reader, c)
    reader = fed.next
    if (fed.result === FEED_REJECTED) next = { ...next, rejected: next.rejected + 1 }
    if (fed.result !== FEED_LINE) continue
    const parsed = parseStateLine(reader.buf)
    if (parsed !== HOST_UNKNOWN) next = { ...next, lastHost: parsed, lastHostMs: nowMs }
  }
  return { ...next, reader }
}

function hostSays(s: VoiceState, text: string, nowMs: number, p: VoiceParams): VoiceState {
  if (!isLinked(p) || !s.devOn) return s
  const ok = parseStateLine(text) !== HOST_UNKNOWN
  return deviceHears(logged(s, { up: false, text: ok ? text : 'STATE:␁␂xxxx…', ok }), text, nowMs)
}

const sendState = (s: VoiceState, nowMs: number, p: VoiceParams): VoiceState =>
  hostSays({ ...s, lastHeartbeatMs: nowMs }, STATE_LINES[wireStateOf(s.host)], nowMs, p)

export const speakableLength = (reply: string): number => Math.min(reply.length, MAX_SPOKEN_CHARS)

function replyFor(p: VoiceParams): string {
  return p.inject === INJECT_LONG_REPLY ? LONG_REPLY_TEXT : REPLY_TEXT
}

function applyAction(s: VoiceState, action: HostAction, nowMs: number, p: VoiceParams): VoiceState {
  if (action === 'START_RECORDING') return { ...s, heard: '', reply: '', spokenChars: 0, jobDoneMs: null }
  if (action === 'FINISH_RECORDING') return { ...s, turns: s.turns + 1, jobDoneMs: nowMs + (p.inject === INJECT_SILENCE ? TRANSCRIBE_MS : PROCESS_MS) }
  if (action === 'SPEAK') return { ...s, spokenChars: speakableLength(s.reply), jobDoneMs: nowMs + speakableLength(s.reply) * SPEAK_MS_PER_CHAR }
  return { ...s, jobDoneMs: null }
}

function dispatch(s: VoiceState, event: HostEvent, nowMs: number, p: VoiceParams): VoiceState {
  const tr = transition(s.host, event)
  const acted = tr.actions.reduce((acc, a) => applyAction(acc, a, nowMs, p), s)
  if (tr.state === s.host) return acted
  return sendState({ ...acted, host: tr.state, hostSinceMs: nowMs }, nowMs, p)
}

const LINE_EVENTS: Record<string, HostEvent> = { [LINE_PTT_DOWN]: 'PTT_DOWN', [LINE_PTT_UP]: 'PTT_UP', [LINE_CANCEL]: 'CANCEL' }

function deviceSays(s: VoiceState, text: string, nowMs: number, p: VoiceParams): VoiceState {
  const event = LINE_EVENTS[text]
  const ok = event !== undefined || text === LINE_READY
  const withLog = logged(s, { up: true, text, ok: ok && isLinked(p) })
  if (!isLinked(p) || !event) return withLog
  return dispatch(withLog, event, nowMs, p)
}

function powerUp(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  const booted: VoiceState = {
    ...s, devOn: true, ptt: releasedButton(nowMs), cancel: releasedButton(nowMs), reader: emptyReader(), lastHost: HOST_UNKNOWN,
    lastHostMs: 0, rawPtt: false, rawCancel: false, lastPtt: p.ptt, pttSeenAtMs: nowMs - BOUNCE_MS, seenCancelSeq: p.cancelSeq
  }
  return sendState(deviceSays(booted, LINE_READY, nowMs, p), nowMs, p)
}

function power(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  if (p.usb === ON && !s.devOn) return powerUp(s, nowMs, p)
  if (p.usb === ON) return s
  const unplugged = s.devOn ? dispatch({ ...s, devOn: false, led: false }, 'DISCONNECTED', nowMs, p) : s
  return { ...unplugged, devOn: false, led: false }
}

function hostApp(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  if (p.app === ON) return s
  return { ...s, host: 'IDLE', hostSinceMs: nowMs, jobDoneMs: null }
}

const isBouncing = (p: VoiceParams, sinceMs: number, nowMs: number): boolean =>
  p.inject === INJECT_BOUNCE && nowMs - sinceMs < BOUNCE_MS

function rawButtons(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  const pttMoved = p.ptt !== s.lastPtt
  const pttSeenAtMs = pttMoved ? nowMs : s.pttSeenAtMs
  const pressedCancel = p.cancelSeq !== s.seenCancelSeq
  const cancelUntilMs = pressedCancel ? nowMs + CANCEL_PRESS_MS : s.cancelUntilMs
  const pttDown = p.ptt === ON
  const rawPtt = isBouncing(p, pttSeenAtMs, nowMs) ? nowMs % 2 === 0 : pttDown
  const cancelStart = cancelUntilMs - CANCEL_PRESS_MS
  const cancelDown = nowMs < cancelUntilMs
  const rawCancel = cancelDown && isBouncing(p, cancelStart, nowMs) ? nowMs % 2 === 0 : cancelDown
  return { ...s, lastPtt: p.ptt, pttSeenAtMs, seenCancelSeq: p.cancelSeq, cancelUntilMs, rawPtt, rawCancel }
}

function buttons(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  const raw = rawButtons(s, nowMs, p)
  const ptt = debounce(raw.ptt, raw.rawPtt, nowMs)
  const cancel = debounce(raw.cancel, raw.rawCancel, nowMs)
  const base = { ...raw, ptt: ptt.next, cancel: cancel.next }
  const afterPtt = ptt.event === EVENT_DOWN ? deviceSays(base, LINE_PTT_DOWN, nowMs, p)
    : ptt.event === EVENT_UP ? deviceSays(base, LINE_PTT_UP, nowMs, p) : base
  return cancel.event === EVENT_DOWN ? deviceSays(afterPtt, LINE_CANCEL, nowMs, p) : afterPtt
}

function finishJob(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  if (s.host === 'SPEAKING') return dispatch(s, 'SPOKEN', nowMs, p)
  if (s.host !== 'PROCESSING') return s
  if (p.inject === INJECT_SILENCE || p.inject === INJECT_CLAUDE_FAIL) {
    return dispatch({ ...s, heard: p.inject === INJECT_SILENCE ? '' : HEARD_TEXT }, 'FAILED', nowMs, p)
  }
  return dispatch({ ...s, heard: HEARD_TEXT, reply: replyFor(p) }, 'REPLY', nowMs, p)
}

function hostTimers(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  if (!isLinked(p)) return s
  if (s.jobDoneMs !== null && nowMs >= s.jobDoneMs) return finishJob({ ...s, jobDoneMs: null }, nowMs, p)
  const settle = SETTLE_MS[s.host]
  if (settle !== undefined && nowMs - s.hostSinceMs >= settle) return dispatch(s, 'SETTLED', nowMs, p)
  return s
}

function heartbeat(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  return nowMs - s.lastHeartbeatMs >= HEARTBEAT_MS ? sendState(s, nowMs, p) : s
}

function noise(s: VoiceState, nowMs: number, p: VoiceParams): VoiceState {
  if (p.inject !== INJECT_SERIAL_NOISE || nowMs < s.nextNoiseMs) return s
  const junkUp = deviceSays({ ...s, nextNoiseMs: nowMs + NOISE_EVERY_MS }, DEVICE_NOISE, nowMs, p)
  return hostSays(junkUp, HOST_NOISE, nowMs, p)
}

export function step(s: VoiceState, p: VoiceParams, dt: number): void {
  const nowMs = Math.round((s.t + dt) * 1000)
  const timed = hostApp({ ...s, t: s.t + dt }, nowMs, p)
  const powered = power(timed, nowMs, p)
  if (!powered.devOn) {
    Object.assign(s, powered)
    return
  }
  const pressed = buttons(powered, nowMs, p)
  const ticked = hostTimers(pressed, nowMs, p)
  const noisy = noise(ticked, nowMs, p)
  const beat = heartbeat(noisy, nowMs, p)
  Object.assign(s, beat, { led: ledOn(deviceShows(beat), nowMs) })
}

export const deviceShows = (s: VoiceState): number => (s.devOn ? shownState(s.lastHost, s.lastHostMs, Math.round(s.t * 1000)) : HOST_UNKNOWN)

export const INJECT_TEXT: Record<number, string> = {
  [INJECT_NONE]: 'مفيش',
  [INJECT_BOUNCE]: 'الزرار بيرعش (Bounce)',
  [INJECT_SILENCE]: 'مفيش كلام اتسمع',
  [INJECT_CLAUDE_FAIL]: 'Claude Code رجّع خطأ',
  [INJECT_SERIAL_NOISE]: 'شوشرة على الـ Serial',
  [INJECT_LONG_REPLY]: 'رد طويل جداً'
}

const INJECT_HINT: Record<number, string> = {
  [INJECT_NONE]: 'كل حاجة سليمة',
  [INJECT_BOUNCE]: 'الزرار بيفتح ويقفل 12 مرة في أول 12 ms: الـ Debounce بيطلّع رسالة واحدة بس',
  [INJECT_SILENCE]: 'التحويل لنص طلّع فاضي: ERROR ثلاث ثواني وبعدين READY',
  [INJECT_CLAUDE_FAIL]: 'claude -p رجّع خطأ: ERROR، ومفيش حاجة بتتقري',
  [INJECT_SERIAL_NOISE]: 'سطور غلط في الاتجاهين: الاتنين بيرموها ومحدش بينفّذها',
  [INJECT_LONG_REPLY]: 'الرد ' + LONG_REPLY_TEXT.length + ' حرف: بيتقري أول ' + MAX_SPOKEN_CHARS + ' بس، ودوسة Cancel توقفه'
}

function choice(key: keyof VoiceParams, label: string, options: number[], format: (v: number) => string, hint: (p: VoiceParams) => string): SimControl<VoiceParams> {
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

const controls: SimControl<VoiceParams>[] = [
  choice('ptt', 'زرار الكلام (PTT)', [OFF, ON], v => (v === ON ? '🎙️ ماسكه' : 'سايبه'), p => (p.ptt === ON ? 'اتكلم دلوقتي: الماك بيسجّل' : 'امسكه واتكلم، وسيبه لما تخلّص')),
  choice('usb', 'كابل USB', [ON, OFF], v => (v === ON ? 'متوصّل' : 'مفصول'), p => (p.usb === ON ? 'الـ ESP32 واخد كهربا من الماك' : 'البرنامج بيلغي أي حاجة شغالة ويستنى الجهاز يرجع')),
  choice('app', 'برنامج الماك', [ON, OFF], v => (v === ON ? 'شغال' : 'مقفول'), p => (p.app === ON ? 'بيبعت الحالة كل ثانية' : 'بعد 3 ثواني الـ LED بتغمز كل ثانيتين = NO HOST')),
  choice('inject', 'جرّب مشكلة', Object.keys(INJECT_TEXT).map(Number), v => INJECT_TEXT[v], p => INJECT_HINT[p.inject])
]

const HOST_LEVEL: Record<HostState, number> = { IDLE: 0, LISTENING: 4, PROCESSING: 3, SPEAKING: 2, CANCELLED: 1, ERROR: 5 }

export const hostText = (s: VoiceState, p: VoiceParams): string => (p.app === OFF ? 'OFF' : s.devOn ? s.host : 'WAITING FOR DEVICE')

export const voiceSim: SimModel<VoiceParams, VoiceState> = {
  title: 'المحاكي: الزرار والـ ESP32 وبرنامج الماك',
  sub: 'نفس الكود اللي على الـ ESP32 ونفس جدول الحالات اللي في برنامج الماك. امسك زرار الكلام وسيبه، وشوف الرسايل رايحة جاية على الـ USB.',
  note: 'التسجيل والتحويل لنص وClaude Code والكلام كلهم على الماك. الـ ESP32 بيبعت ضغطات الزرار بس، وبيعرض الحالة على الـ LED. الأوقات هنا تقريبية: الرد الحقيقي ممكن ياخد أكتر.',
  footnote: 'آخر 3 ثواني: الزرار قبل وبعد الـ Debounce، والـ LED، وحالة البرنامج (فوق = بيسمع، تحت = مستني).',
  defaults,
  controls,
  traces: [
    { key: 'raw', label: 'الزرار (الرجل نفسها)', color: '#93c5fd', height: 24, max: 1, value: s => (s.rawPtt ? 1 : 0), fill: true },
    { key: 'clean', label: 'بعد الـ Debounce', color: '#5aa9ff', height: 24, max: 1, value: s => (s.ptt.stable ? 1 : 0), fill: true },
    { key: 'led', label: 'الـ LED', color: '#ffb547', height: 24, max: 1, value: s => (s.led ? 1 : 0), fill: true },
    { key: 'host', label: 'حالة البرنامج', color: '#c084fc', height: 50, max: 5, value: s => HOST_LEVEL[s.host], fill: true }
  ],
  readouts: [
    { label: 'البرنامج', value: hostText },
    { label: 'الجهاز بيعرض', value: s => (s.devOn ? stateLabel(deviceShows(s)) : '—') },
    { label: 'آخر رسالة من الجهاز', value: s => [...s.serial].reverse().find(l => l.up)?.text ?? '—' },
    { label: 'آخر رسالة للجهاز', value: s => [...s.serial].reverse().find(l => !l.up)?.text ?? '—' },
    { label: 'سطور اترمت', value: s => String(s.rejected) },
    { label: 'مرات الكلام', value: s => String(s.turns) },
    { label: 'اللي بيتقري', value: s => (s.spokenChars ? s.spokenChars + ' من ' + s.reply.length + ' حرف' : '—') }
  ],
  init,
  step,
  brightness: s => (s.led ? 1 : 0),
  netReading: () => '—'
}

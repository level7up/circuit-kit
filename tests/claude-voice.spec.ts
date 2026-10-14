import { describe, expect, it } from 'vitest'
import {
  DEBOUNCE_MS, EVENT_DOWN, EVENT_NONE, EVENT_UP, FEED_LINE, FEED_REJECTED, HOST_ERROR, HOST_IDLE, HOST_LISTENING, HOST_PROCESSING,
  HOST_SPEAKING, HOST_TIMEOUT_MS, HOST_UNKNOWN, MAX_LINE_CHARS, debounce, emptyReader, feed, ledOn, parseStateLine, releasedButton,
  shownState, stateLabel
} from '../src/circuits/claude-voice/device'
import { TRANSITIONS, transition, wireStateOf, type HostEvent, type HostState } from '../src/circuits/claude-voice/host'
import { J1, PIN_GPIO } from '../src/circuits/claude-voice/pinout'
import {
  HEARD_TEXT, INJECT_BOUNCE, INJECT_CLAUDE_FAIL, INJECT_LONG_REPLY, INJECT_SERIAL_NOISE, INJECT_SILENCE, LONG_REPLY_TEXT, MAX_SPOKEN_CHARS,
  OFF, ON, REPLY_TEXT, defaults, deviceShows, voiceSim, type VoiceParams, type VoiceState
} from '../src/circuits/claude-voice/simulate'
import { steps } from '../src/circuits/claude-voice/steps'
import { SCENE_H, SCENE_W } from '../src/lib/scene/draw'

function pressEvents(raw: boolean[]): number[] {
  let d = releasedButton(0)
  return raw.flatMap((down, ms) => {
    const s = debounce(d, down, ms + 1)
    d = s.next
    return s.event === EVENT_NONE ? [] : [s.event]
  })
}

const held = (ms: number, down: boolean): boolean[] => Array.from({ length: ms }, () => down)
const bouncing = (ms: number): boolean[] => Array.from({ length: ms }, (_, i) => i % 2 === 0)

function feedAll(text: string): { lines: string[]; rejected: number } {
  let r = emptyReader()
  const lines: string[] = []
  let rejected = 0
  for (const c of text) {
    const s = feed(r, c)
    r = s.next
    if (s.result === FEED_LINE) lines.push(r.buf)
    if (s.result === FEED_REJECTED) rejected++
  }
  return { lines, rejected }
}

describe('voice device firmware mirror', () => {
  it('sends one down and one up for a clean press', () => {
    expect(pressEvents([...held(10, false), ...held(200, true), ...held(100, false)])).toEqual([EVENT_DOWN, EVENT_UP])
  })

  it('filters contact bounce', () => {
    expect(pressEvents([...bouncing(12), ...held(200, true), ...bouncing(12), ...held(100, false)])).toEqual([EVENT_DOWN, EVENT_UP])
  })

  it('ignores taps shorter than the debounce window', () => {
    expect(pressEvents([...held(10, false), ...held(DEBOUNCE_MS - 5, true), ...held(100, false)])).toEqual([])
  })

  it('never repeats down while the button is held', () => {
    expect(pressEvents(held(5000, true))).toEqual([EVENT_DOWN])
  })

  it('splits lines and rejects long or binary ones', () => {
    expect(feedAll('STATE:IDLE\r\nSTATE:SPEAKING\n').lines).toEqual(['STATE:IDLE', 'STATE:SPEAKING'])
    const junk = feedAll('A'.repeat(MAX_LINE_CHARS + 5) + '\nSTATE:ERROR\nST\u0001TE\n')
    expect(junk).toEqual({ lines: ['STATE:ERROR'], rejected: 2 })
  })

  it('accepts only the exact state lines', () => {
    expect(['STATE:IDLE', 'STATE:LISTENING', 'STATE:PROCESSING', 'STATE:SPEAKING', 'STATE:ERROR'].map(parseStateLine))
      .toEqual([HOST_IDLE, HOST_LISTENING, HOST_PROCESSING, HOST_SPEAKING, HOST_ERROR])
    expect(['STATE:idle', 'STATE:IDLE ', 'rm -rf /', ''].map(parseStateLine)).toEqual([HOST_UNKNOWN, HOST_UNKNOWN, HOST_UNKNOWN, HOST_UNKNOWN])
  })

  it('forgets the host state after the timeout', () => {
    expect(shownState(HOST_SPEAKING, 1000, 1000 + HOST_TIMEOUT_MS)).toBe(HOST_SPEAKING)
    expect(shownState(HOST_SPEAKING, 1000, 1001 + HOST_TIMEOUT_MS)).toBe(HOST_UNKNOWN)
  })

  it('lights the LED with a distinct share of time per state', () => {
    const lit = (s: number, period: number) => Array.from({ length: period }, (_, t) => ledOn(s, t)).filter(Boolean).length
    expect([lit(HOST_IDLE, 2000), lit(HOST_LISTENING, 2000), lit(HOST_PROCESSING, 2000), lit(HOST_SPEAKING, 2000), lit(HOST_ERROR, 1000), lit(HOST_UNKNOWN, 2000)])
      .toEqual([0, 2000, 1000, 1000, 200, 60])
    expect(stateLabel(HOST_PROCESSING)).toBe('THINKING')
    expect(stateLabel(HOST_UNKNOWN)).toBe('NO HOST')
  })
})

describe('voice host state machine', () => {
  it('runs a full turn', () => {
    const walk: [HostEvent, HostState][] = [['PTT_DOWN', 'LISTENING'], ['PTT_UP', 'PROCESSING'], ['REPLY', 'SPEAKING'], ['SPOKEN', 'IDLE']]
    walk.reduce<HostState>((state, [event, expected]) => {
      const next = transition(state, event).state
      expect(next, event).toBe(expected)
      return next
    }, 'IDLE')
  })

  it('stops whatever is running on cancel', () => {
    expect(transition('LISTENING', 'CANCEL')).toEqual({ state: 'CANCELLED', actions: ['DISCARD_RECORDING'] })
    expect(transition('PROCESSING', 'CANCEL')).toEqual({ state: 'CANCELLED', actions: ['ABORT_REQUEST'] })
    expect(transition('SPEAKING', 'CANCEL')).toEqual({ state: 'CANCELLED', actions: ['STOP_SPEAKING'] })
  })

  it('lets a new press interrupt speech', () => {
    expect(transition('SPEAKING', 'PTT_DOWN')).toEqual({ state: 'LISTENING', actions: ['STOP_SPEAKING', 'START_RECORDING'] })
  })

  it('never leaves a busy state stuck when the device disappears', () => {
    const busy: HostState[] = ['LISTENING', 'PROCESSING', 'SPEAKING']
    busy.forEach(s => expect(transition(s, 'DISCONNECTED').state, s).toBe('IDLE'))
  })

  it('ignores events that do not apply', () => {
    expect(transition('IDLE', 'REPLY')).toEqual({ state: 'IDLE', actions: [] })
    expect(transition('CANCELLED', 'PTT_UP')).toEqual({ state: 'CANCELLED', actions: [] })
  })

  it('maps every host state to a line the device understands', () => {
    Object.keys(TRANSITIONS).forEach(s => expect(wireStateOf(s as HostState), s).not.toBe(HOST_UNKNOWN))
    expect(wireStateOf('CANCELLED')).toBe(HOST_IDLE)
  })
})

const STEP = 0.001

function run(p: VoiceParams, seconds: number, s: VoiceState = voiceSim.init(p)): VoiceState {
  for (let t = 0; t < seconds; t += STEP) voiceSim.step(s, p, STEP)
  return s
}

const holding = (p: VoiceParams): VoiceParams => ({ ...p, ptt: ON })
const released = (p: VoiceParams): VoiceParams => ({ ...p, ptt: OFF })
const cancelled = (p: VoiceParams): VoiceParams => ({ ...p, cancelSeq: p.cancelSeq + 1 })

function talk(p: VoiceParams, holdS = 1): VoiceState {
  const s = run(p, 0.5)
  run(holding(p), holdS, s)
  return run(released(p), 0.05, s)
}

const upLines = (s: VoiceState): string[] => s.serial.filter(l => l.up).map(l => l.text)

describe('voice terminal simulator', () => {
  it('boots, says ready and gets a state back', () => {
    const s = run(defaults, 0.1)
    expect(upLines(s)).toEqual(['DEV:READY'])
    expect(deviceShows(s)).toBe(HOST_IDLE)
    expect(s.led).toBe(false)
  })

  it('goes through a whole turn and back to idle', () => {
    const s = talk(defaults)
    expect(s.host).toBe('PROCESSING')
    run(defaults, 3, s)
    expect(s.host).toBe('SPEAKING')
    expect(s.heard).toBe(HEARD_TEXT)
    expect(deviceShows(s)).toBe(HOST_SPEAKING)
    run(defaults, 5, s)
    expect(s.host).toBe('IDLE')
    expect(s.turns).toBe(1)
  })

  it('lights the LED solid while listening', () => {
    const s = run(holding(defaults), 0.5, run(defaults, 0.5))
    expect(s.host).toBe('LISTENING')
    expect(s.led).toBe(true)
  })

  it('sends a single down and up through contact bounce', () => {
    const p = { ...defaults, inject: INJECT_BOUNCE }
    const s = talk(p)
    expect(upLines(s).filter(l => l.startsWith('BTN:'))).toEqual(['BTN:PTT_DOWN', 'BTN:PTT_UP'])
  })

  it('cancels while thinking and returns to idle', () => {
    const s = talk(defaults)
    run(cancelled(defaults), 0.3, s)
    expect(s.host).toBe('CANCELLED')
    run(cancelled(defaults), 1, s)
    expect(s.host).toBe('IDLE')
    expect(s.reply).toBe('')
  })

  it('shows an error when nothing was heard, then recovers', () => {
    const p = { ...defaults, inject: INJECT_SILENCE }
    const s = talk(p)
    run(p, 1, s)
    expect(s.host).toBe('ERROR')
    expect(deviceShows(s)).toBe(HOST_ERROR)
    run(p, 3, s)
    expect(s.host).toBe('IDLE')
  })

  it('does not speak when Claude Code fails', () => {
    const p = { ...defaults, inject: INJECT_CLAUDE_FAIL }
    const s = run(p, 3, talk(p))
    expect(s.host).toBe('ERROR')
    expect(s.spokenChars).toBe(0)
  })

  it('rejects serial noise in both directions without acting on it', () => {
    const p = { ...defaults, inject: INJECT_SERIAL_NOISE }
    const s = run(p, 4)
    expect(s.rejected).toBeGreaterThan(0)
    expect(s.host).toBe('IDLE')
    expect(s.serial.some(l => !l.ok)).toBe(true)
  })

  it('speaks only the first part of a long reply and stops on a new press', () => {
    const p = { ...defaults, inject: INJECT_LONG_REPLY }
    const s = run(p, 3, talk(p))
    expect(s.host).toBe('SPEAKING')
    expect(s.reply).toBe(LONG_REPLY_TEXT)
    expect(s.spokenChars).toBe(MAX_SPOKEN_CHARS)
    run(holding(p), 0.1, s)
    expect(s.host).toBe('LISTENING')
  })

  it('cancels everything when the cable is pulled mid-turn and recovers on replug', () => {
    const s = talk(defaults)
    run({ ...defaults, usb: OFF }, 0.5, s)
    expect(s.host).toBe('IDLE')
    expect(s.led).toBe(false)
    run(defaults, 0.5, s)
    expect(upLines(s).at(-1)).toBe('DEV:READY')
    expect(deviceShows(s)).toBe(HOST_IDLE)
  })

  it('falls back to the no-host blip when the Mac app stops', () => {
    const p = { ...defaults, app: OFF }
    const s = run(p, 4, run(defaults, 0.5))
    expect(deviceShows(s)).toBe(HOST_UNKNOWN)
  })

  it('reads the normal reply in full', () => {
    const s = run(defaults, 3, talk(defaults))
    expect(s.reply).toBe(REPLY_TEXT)
    expect(s.spokenChars).toBe(REPLY_TEXT.length)
  })
})

describe('voice terminal guide', () => {
  it('puts every used GPIO on the J1 drawing', () => {
    Object.values(PIN_GPIO).forEach(g => expect(J1.some(p => p.name === 'GPIO' + g), 'GPIO' + g).toBe(true))
  })

  it('keeps scenes inside the frame', () => {
    steps.flatMap(s => s.scene ?? []).forEach(f => {
      const nums = [...f.svg.matchAll(/(?:x|cx|y|cy)="(-?\d+(?:\.\d+)?)"/g)].map(m => Number(m[1]))
      expect(Math.max(...nums)).toBeLessThanOrEqual(Math.max(SCENE_W, SCENE_H))
      f.spots?.forEach(sp => expect(sp.x <= SCENE_W && sp.y <= SCENE_H).toBe(true))
    })
  })
})

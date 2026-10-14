import {
  ECU_ADDRESS,
  END_BYTE,
  HEADER_BYTES,
  KEY_BYTE_INDEX,
  MAX_BLOCKS,
  MAX_KEYWORDS,
  MAX_LENGTH,
  MIN_LENGTH,
  SYNC_BYTE,
  TITLE,
  WAKE_DATA_BITS,
  complement,
  titleFor,
  wakeBitHigh,
  type Block,
  type Purpose,
  type Reply,
  type Request
} from './protocol'

export type Phase = 'off' | 'wake' | 'sync' | 'keywords' | 'link' | 'ready' | 'backoff'
export type Fault =
  | 'none'
  | 'no-sync'
  | 'timeout'
  | 'echo'
  | 'complement'
  | 'length'
  | 'end-byte'
  | 'unexpected-byte'
  | 'too-many-blocks'
type Await = 'send' | 'echo' | 'complement' | 'data'

export interface Timing {
  readonly preWakeIdleMs: number
  readonly wakeBitMs: number
  readonly syncTimeoutMs: number
  readonly keywordGapMs: number
  readonly byteTimeoutMs: number
  readonly byteDelayMs: number
  readonly keepAliveMs: number
  readonly backoffMs: number
}

export const MA17_TIMING: Timing = {
  preWakeIdleMs: 300,
  wakeBitMs: 200,
  syncTimeoutMs: 2000,
  keywordGapMs: 250,
  byteTimeoutMs: 1000,
  byteDelayMs: 2,
  keepAliveMs: 500,
  backoffMs: 2600
}

export interface Inputs {
  readonly nowMs: number
  readonly rx: number | null
}

export interface Outputs {
  readonly driveLine: boolean
  readonly lineHigh: boolean
  readonly tx: number | null
}

interface ByteLink {
  readonly await: Await
  readonly sinceMs: number
  readonly pending: number
  readonly sending: boolean
  readonly bytes: readonly number[]
  readonly index: number
}

export interface Session {
  readonly phase: Phase
  readonly fault: Fault
  readonly phaseSinceMs: number
  readonly keywords: readonly number[]
  readonly lastKeywordMs: number
  readonly counter: number
  readonly wire: ByteLink
  readonly purpose: Purpose
  readonly collecting: Reply
  readonly pending: Request | null
  readonly lastExchangeMs: number
  readonly ident: Reply | null
  readonly reply: Reply | null
  readonly reconnects: number
  readonly out: Outputs
}

const IDLE: Outputs = { driveLine: false, lineHigh: true, tx: null }
const emptyReply = (purpose: Purpose): Reply => ({ purpose, rejected: false, blocks: [] })

export const initialSession = (): Session => ({
  phase: 'off',
  fault: 'none',
  phaseSinceMs: 0,
  keywords: [],
  lastKeywordMs: 0,
  counter: 0,
  wire: { await: 'data', sinceMs: 0, pending: 0, sending: false, bytes: [], index: 0 },
  purpose: 'ident',
  collecting: emptyReply('ident'),
  pending: null,
  lastExchangeMs: 0,
  ident: null,
  reply: null,
  reconnects: 0,
  out: IDLE
})

const enter = (s: Session, phase: Phase, nowMs: number): Session => ({ ...s, phase, phaseSinceMs: nowMs })

export const start = (s: Session, nowMs: number): Session =>
  s.phase === 'off' ? enter(initialSession(), 'wake', nowMs) : s

export const stop = (s: Session): Session => ({ ...s, phase: 'off', pending: null, out: IDLE })

export const isConnected = (s: Session): boolean =>
  s.phase === 'ready' || (s.phase === 'link' && s.purpose !== 'ident')

export const displayPhase = (s: Session): Phase => (s.phase === 'link' && s.purpose === 'keep-alive' ? 'ready' : s.phase)

export const canRequest = (s: Session, r: Request): boolean =>
  r.valid && isConnected(s) && s.pending === null && s.reply === null

export const request = (s: Session, r: Request): Session => (canRequest(s, r) ? { ...s, pending: r } : s)

export const takeReply = (s: Session): Session => ({ ...s, reply: null })

const fail = (s: Session, fault: Fault, nowMs: number): Session => enter({ ...s, fault, pending: null }, 'backoff', nowMs)

const awaitNext = (s: Session, wait: Await, pending: number, nowMs: number, wire: Partial<ByteLink> = {}): Session => ({
  ...s,
  wire: { ...s.wire, ...wire, await: wait, pending, sinceMs: nowMs }
})

function sendBlock(s: Session, title: number, data: readonly number[], nowMs: number): Session {
  const counter = (s.counter + 1) & 0xff
  const bytes = [data.length + HEADER_BYTES, counter, title, ...data, END_BYTE]
  return awaitNext(enter({ ...s, counter }, 'link', nowMs), 'send', bytes[0], nowMs, { bytes, index: 0, sending: true })
}

const decodeBlock = (bytes: readonly number[]): Block => ({
  counter: bytes[1],
  title: bytes[2],
  data: bytes.slice(HEADER_BYTES, bytes[0])
})

function finishExchange(s: Session, rejected: boolean, nowMs: number): Session {
  const done: Reply = { ...s.collecting, rejected }
  const ident = s.purpose === 'ident' ? done : s.ident
  const reply = s.purpose !== 'ident' && s.purpose !== 'keep-alive' ? done : s.reply
  return enter({ ...s, ident, reply, lastExchangeMs: nowMs }, 'ready', nowMs)
}

function blockReceived(s: Session, nowMs: number): Session {
  const block = decodeBlock(s.wire.bytes)
  const next = { ...s, counter: block.counter }
  if (block.title === TITLE.ack) return finishExchange(next, false, nowMs)
  if (block.title === TITLE.nak) return finishExchange(next, true, nowMs)
  if (s.purpose === 'keep-alive') return sendBlock(next, TITLE.ack, [], nowMs)
  if (s.collecting.blocks.length >= MAX_BLOCKS) return fail(next, 'too-many-blocks', nowMs)
  const collecting = { ...s.collecting, blocks: [...s.collecting.blocks, block] }
  return sendBlock({ ...next, collecting }, TITLE.ack, [], nowMs)
}

function byteReceived(s: Session, b: number, nowMs: number): Session {
  const index = s.wire.index
  if (index === 0 && (b < MIN_LENGTH || b > MAX_LENGTH)) return fail(s, 'length', nowMs)
  const bytes = [...s.wire.bytes.slice(0, index), b]
  const next = { ...s, wire: { ...s.wire, bytes, index: index + 1 } }
  if (index < bytes[0]) return awaitNext(next, 'send', complement(b), nowMs)
  if (b !== END_BYTE) return fail(next, 'end-byte', nowMs)
  return blockReceived(next, nowMs)
}

function echoed(s: Session, nowMs: number): Session {
  if (!s.wire.sending) return awaitNext(s, 'data', 0, nowMs)
  if (s.wire.index + 1 === s.wire.bytes.length) return awaitNext(s, 'data', 0, nowMs, { sending: false, index: 0, bytes: [] })
  return awaitNext(s, 'complement', complement(s.wire.bytes[s.wire.index]), nowMs)
}

function stepLink(s: Session, input: Inputs, t: Timing): Session {
  const { nowMs, rx } = input
  if (s.wire.await === 'send') {
    if (rx !== null) return fail(s, 'unexpected-byte', nowMs)
    if (nowMs - s.wire.sinceMs < t.byteDelayMs) return s
    return awaitNext({ ...s, out: { ...IDLE, tx: s.wire.pending } }, 'echo', s.wire.pending, nowMs)
  }
  if (rx === null) return nowMs - s.wire.sinceMs > t.byteTimeoutMs ? fail(s, 'timeout', nowMs) : s
  if (s.wire.await === 'echo') return rx === s.wire.pending ? echoed(s, nowMs) : fail(s, 'echo', nowMs)
  if (s.wire.await === 'complement') {
    if (rx !== s.wire.pending) return fail(s, 'complement', nowMs)
    const index = s.wire.index + 1
    return awaitNext(s, 'send', s.wire.bytes[index], nowMs, { index })
  }
  return byteReceived(s, rx, nowMs)
}

function stepWake(s: Session, input: Inputs, t: Timing): Session {
  const elapsed = input.nowMs - s.phaseSinceMs
  if (elapsed < t.preWakeIdleMs) return { ...s, out: { ...IDLE, driveLine: true } }
  const bit = Math.floor((elapsed - t.preWakeIdleMs) / t.wakeBitMs)
  if (bit <= WAKE_DATA_BITS) return { ...s, out: { ...IDLE, driveLine: true, lineHigh: wakeBitHigh(ECU_ADDRESS, bit) } }
  return enter(s, 'sync', input.nowMs)
}

function stepSync(s: Session, input: Inputs, t: Timing): Session {
  if (input.rx === SYNC_BYTE) return enter({ ...s, keywords: [SYNC_BYTE], lastKeywordMs: input.nowMs }, 'keywords', input.nowMs)
  return input.nowMs - s.phaseSinceMs > t.syncTimeoutMs ? fail(s, 'no-sync', input.nowMs) : s
}

function replyToKeywords(s: Session, nowMs: number): Session {
  const next = enter({ ...s, purpose: 'ident', collecting: emptyReply('ident'), counter: 0 }, 'link', nowMs)
  return awaitNext(next, 'send', complement(s.keywords[KEY_BYTE_INDEX]), nowMs, { sending: false, index: 0, bytes: [] })
}

function stepKeywords(s: Session, input: Inputs, t: Timing): Session {
  if (input.rx !== null) {
    const keywords = s.keywords.length < MAX_KEYWORDS ? [...s.keywords, input.rx] : s.keywords
    return { ...s, keywords, lastKeywordMs: input.nowMs }
  }
  if (input.nowMs - s.lastKeywordMs < t.keywordGapMs) return s
  if (s.keywords.length <= KEY_BYTE_INDEX) return fail(s, 'no-sync', input.nowMs)
  return replyToKeywords(s, input.nowMs)
}

function stepReady(s: Session, input: Inputs, t: Timing): Session {
  if (input.rx !== null) return fail(s, 'unexpected-byte', input.nowMs)
  if (s.pending) {
    const purpose = s.pending.purpose
    const next = { ...s, pending: null, purpose, collecting: emptyReply(purpose) }
    return sendBlock(next, titleFor(purpose), s.pending.data, input.nowMs)
  }
  if (input.nowMs - s.lastExchangeMs < t.keepAliveMs) return s
  return sendBlock({ ...s, purpose: 'keep-alive' }, TITLE.ack, [], input.nowMs)
}

function stepBackoff(s: Session, input: Inputs, t: Timing): Session {
  if (input.nowMs - s.phaseSinceMs < t.backoffMs) return s
  return enter({ ...s, reconnects: s.reconnects + 1, ident: null }, 'wake', input.nowMs)
}

const STEPS: Record<Phase, ((s: Session, input: Inputs, t: Timing) => Session) | null> = {
  off: null,
  wake: stepWake,
  sync: stepSync,
  keywords: stepKeywords,
  link: stepLink,
  ready: stepReady,
  backoff: stepBackoff
}

export function step(s: Session, input: Inputs, t: Timing = MA17_TIMING): Session {
  const fresh = { ...s, out: IDLE }
  const run = STEPS[s.phase]
  return run ? run(fresh, input, t) : fresh
}

import { describe, expect, it } from 'vitest'
import { ECU_ADDRESS, MAX_MEMORY_READ, TITLE, identText, readErrors, readMemory, readSensors, titleFor, type Purpose, type Request } from '../src/tempra/protocol'
import { MA17_TIMING as T, canRequest, displayPhase, initialSession, request, start, step, stop, takeReply, type Session } from '../src/tempra/session'
import { EcuSim, LINK_WATCHDOG_MS, type Scheduled } from '../src/tempra/ecu-sim'

const CONNECT_WITHIN_MS = 3000
const WAKE_MS = T.preWakeIdleMs + T.wakeBitMs * 10

interface Rig {
  s: Session
  ecu: EcuSim
  nowMs: number
  bus: Scheduled[]
}

function fresh(setup: (e: EcuSim) => void = () => {}): Rig {
  const ecu = new EcuSim(T.wakeBitMs)
  setup(ecu)
  return { s: start(initialSession(), 1000), ecu, nowMs: 1000, bus: [] }
}

function schedule(bus: Scheduled[], item: Scheduled): Scheduled[] {
  const at = bus.findIndex(b => b.atMs > item.atMs)
  return at < 0 ? [...bus, item] : [...bus.slice(0, at), item, ...bus.slice(at)]
}

function tickOnce(r: Rig): Rig {
  const nowMs = r.nowMs + 1
  const due = r.bus.length > 0 && r.bus[0].atMs <= nowMs
  const s = step(r.s, { nowMs, rx: due ? r.bus[0].byte : null }, T)
  let bus = due ? r.bus.slice(1) : r.bus
  r.ecu.line(nowMs, s.out.driveLine, s.out.lineHigh)
  if (s.out.tx !== null) {
    bus = schedule(bus, { atMs: nowMs + 1, byte: s.out.tx })
    r.ecu.receive(nowMs, s.out.tx)
  }
  r.ecu.tick(nowMs)
  bus = r.ecu.outbox.reduce(schedule, bus)
  r.ecu.outbox = []
  return { ...r, s, nowMs, bus }
}

function run(r: Rig, ms: number): Rig {
  let x = r
  for (let i = 0; i < ms; i++) x = tickOnce(x)
  return x
}

function runUntil(r: Rig, maxMs: number, done: (x: Rig) => boolean): Rig {
  let x = r
  for (let i = 0; i < maxMs && !done(x); i++) x = tickOnce(x)
  return x
}

const connected = (setup?: (e: EcuSim) => void): Rig => runUntil(fresh(setup), CONNECT_WITHIN_MS, x => x.s.ident !== null)

const ask = (r: Rig, q: Request): Rig =>
  runUntil({ ...r, s: request(r.s, q) }, CONNECT_WITHIN_MS, x => x.s.reply !== null || x.s.phase === 'backoff')

const taken = (r: Rig): Rig => ({ ...r, s: takeReply(r.s) })

describe('MA1.7 wake-up', () => {
  it('sends address 0x10 at 5 baud', () => {
    const r = run(fresh(), WAKE_MS)
    expect(r.ecu.wakeAddresses).toEqual([ECU_ADDRESS])
  })

  it('holds the line idle high before the start bit', () => {
    let r = fresh()
    for (let i = 1; i < T.preWakeIdleMs; i++) {
      r = tickOnce(r)
      expect(r.s.out.driveLine && r.s.out.lineHigh).toBe(true)
    }
    r = tickOnce(r)
    expect(r.s.out.driveLine && !r.s.out.lineHigh).toBe(true)
  })
})

describe('MA1.7 handshake', () => {
  it('replies with the inverse of the third keyword byte', () => {
    expect(connected().ecu.keyReplies).toEqual([0x7a])
  })

  it('works when the ECU sends six keyword bytes', () => {
    const r = connected(e => (e.keywords = [0x55, 0x46, 0x85, 0x89, 0xbc, 0x10]))
    expect(r.s.ident).not.toBeNull()
    expect(r.ecu.keyReplies).toEqual([0x7a])
  })

  it('collects the identification blocks and becomes ready', () => {
    const r = connected()
    expect(r.s.phase).toBe('ready')
    expect(r.s.ident?.blocks).toHaveLength(2)
    expect(identText(r.s.ident!)).toBe('0261200721BOSCH MA17')
  })

  it('shows unprintable identification bytes as dots', () => {
    const r = connected(e => (e.ident = 'AB\x01C'))
    expect(identText(r.s.ident!)).toBe('AB.C')
  })
})

describe('MA1.7 read-only requests', () => {
  it('collects every stored fault-code block', () => {
    const r = ask(connected(e => (e.dtcs = [[0x12, 0x00, 0x1e], [0x34, 0x00, 0x9e]])), readErrors())
    expect(r.s.reply?.purpose).toBe('read-errors')
    expect(r.s.reply?.blocks.map(b => b.title)).toEqual([TITLE.errorData, TITLE.errorData])
    expect(r.s.reply?.blocks[1].data).toEqual([0x34, 0x00, 0x9e])
  })

  it('returns an empty reply when no codes are stored', () => {
    const r = ask(connected(), readErrors())
    expect(r.s.reply).toEqual({ purpose: 'read-errors', rejected: false, blocks: [] })
  })

  it('sends length and address for a memory read', () => {
    const r = ask(connected(e => e.memory.splice(0x40, 2, 0xaa, 0xbb)), readMemory(0x0040, 2))
    expect(r.s.reply?.blocks[0].title).toBe(TITLE.memoryData)
    expect(r.s.reply?.blocks[0].data).toEqual([0xaa, 0xbb])
  })

  it('rejects memory reads outside 1–12 bytes', () => {
    expect(readMemory(0x40, 0).valid).toBe(false)
    expect(readMemory(0x40, MAX_MEMORY_READ + 1).valid).toBe(false)
    expect(readMemory(0x40, MAX_MEMORY_READ).valid).toBe(true)
    const r = connected()
    expect(canRequest(r.s, readMemory(0x40, 0))).toBe(false)
    expect(request(r.s, readMemory(0x40, 0)).pending).toBeNull()
  })

  it('returns the sensor collection', () => {
    const r = ask(connected(e => (e.sensors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])), readSensors())
    expect(r.s.reply?.blocks[0].title).toBe(TITLE.sensorData)
    expect(r.s.reply?.blocks[0].data).toHaveLength(10)
  })

  it('refuses requests before the link is up', () => {
    const r = fresh()
    expect(canRequest(r.s, readErrors())).toBe(false)
    expect(request(r.s, readErrors()).pending).toBeNull()
  })

  it('refuses a second request while one is pending', () => {
    const r = connected()
    expect(canRequest(request(r.s, readErrors()), readSensors())).toBe(false)
  })

  it('clears a reply once taken', () => {
    expect(takeReply(ask(connected(), readErrors()).s).reply).toBeNull()
  })

  it('marks a NAK as rejected and keeps the link', () => {
    let r = ask(connected(e => (e.faults.nakNextRequest = true)), readErrors())
    expect(r.s.reply?.rejected).toBe(true)
    r = run(taken(r), 2000)
    expect(['ready', 'link']).toContain(r.s.phase)
    expect(r.ecu.drops).toBe(0)
  })

  it('never puts a clear-codes or actuator title on the wire', () => {
    let r = ask(connected(e => (e.dtcs = [[0x12, 0x00, 0x1e]])), readErrors())
    r = ask(taken(r), readMemory(0x10, 4))
    r = ask(taken(r), readSensors())
    expect(r.ecu.titlesReceived.length).toBeGreaterThan(3)
    expect(r.ecu.titlesReceived).not.toContain(0x04)
    expect(r.ecu.titlesReceived).not.toContain(0x05)
    const all: Purpose[] = ['ident', 'read-errors', 'read-memory', 'read-sensors', 'keep-alive']
    all.forEach(p => expect([0x04, 0x05]).not.toContain(titleFor(p)))
  })
})

describe('MA1.7 link upkeep', () => {
  it('keeps the link alive while idle', () => {
    const r = run(connected(), 5000)
    expect(['ready', 'link']).toContain(r.s.phase)
    expect(r.ecu.drops).toBe(0)
    expect(r.s.reconnects).toBe(0)
    const gaps = r.ecu.ackTimesMs.slice(1).map((t, i) => t - r.ecu.ackTimesMs[i])
    expect(r.ecu.ackTimesMs.length).toBeGreaterThan(5)
    expect(Math.max(...gaps)).toBeLessThan(LINK_WATCHDOG_MS)
  })

  it('keeps showing ready through keep-alive exchanges', () => {
    let r = connected()
    const shown = new Set<string>()
    const raw = new Set<string>()
    for (let i = 0; i < 3000; i++) {
      r = tickOnce(r)
      shown.add(displayPhase(r.s))
      raw.add(r.s.phase)
    }
    expect(raw).toContain('link')
    expect([...shown]).toEqual(['ready'])
  })

  it('shows link while a real request is in flight', () => {
    const r = connected()
    const asked = { ...r, s: request(r.s, readErrors()) }
    const next = runUntil(asked, 100, x => x.s.phase === 'link')
    expect(displayPhase(next.s)).toBe('link')
  })

  it('backs off and retries when the ECU stays silent', () => {
    let r = runUntil(fresh(e => (e.faults.silent = true)), 10000, x => x.s.phase === 'backoff')
    expect(r.s.fault).toBe('no-sync')
    r = run(r, T.backoffMs + WAKE_MS)
    expect(r.ecu.wakeAddresses).toHaveLength(2)
    expect(r.s.reconnects).toBe(1)
  })

  it('faults on a wrong complement, drops the request and reconnects', () => {
    const c = connected()
    c.ecu.faults.corruptNextComplement = true
    let r = ask(c, readErrors())
    expect(r.s.fault).toBe('complement')
    expect(r.s.pending).toBeNull()
    r = runUntil(r, 10000, x => x.s.phase === 'ready' && x.s.reconnects === 1)
    expect(r.s.phase).toBe('ready')
  })

  it('faults on a bad end byte', () => {
    const c = connected()
    c.ecu.faults.badEndOnce = true
    expect(ask(c, readErrors()).s.fault).toBe('end-byte')
  })

  it('faults on an oversize length byte', () => {
    const c = connected()
    c.ecu.faults.oversizeOnce = true
    expect(ask(c, readErrors()).s.fault).toBe('length')
  })

  it('releases the line when stopped', () => {
    const r = run(fresh(), 50)
    const s = step(stop(r.s), { nowMs: r.nowMs + 1, rx: null }, T)
    expect(s.phase).toBe('off')
    expect(s.out.driveLine).toBe(false)
    expect(s.out.tx).toBeNull()
  })
})

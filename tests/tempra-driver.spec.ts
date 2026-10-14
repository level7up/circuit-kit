import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readErrors } from '../src/tempra/protocol'
import { MA17_TIMING as T, type Session } from '../src/tempra/session'
import { formatLog, startDriver, type Driver } from '../src/tempra/serial-driver'
import { DemoKklPort as FakeKklPort } from '../src/tempra/demo-port'
import { EcuSim } from '../src/tempra/ecu-sim'

interface Harness {
  port: FakeKklPort
  driver: Driver
  latest: () => Session | null
  errors: string[]
}

async function connect(setup: (e: EcuSim) => void = () => {}): Promise<Harness> {
  const ecu = new EcuSim(T.wakeBitMs)
  setup(ecu)
  const port = new FakeKklPort(ecu)
  let latest: Session | null = null
  const errors: string[] = []
  const driver = await startDriver(port, { onSession: s => (latest = s), onError: m => errors.push(m) }, { clock: () => Date.now() })
  await vi.advanceTimersByTimeAsync(3000)
  return { port, driver, latest: () => latest, errors }
}

describe('Web Serial driver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('opens the port at 4800 baud 8N1', async () => {
    const h = await connect()
    expect(h.port.opened).toEqual({ baudRate: 4800, dataBits: 8, stopBits: 1, parity: 'none' })
  })

  it('wakes the ECU with break signals and reads its identification', async () => {
    const h = await connect()
    expect(h.port.ecu.wakeAddresses).toEqual([0x10])
    expect(h.latest()?.phase).toBe('ready')
    expect(h.latest()?.ident?.blocks).toHaveLength(2)
    expect(h.errors).toEqual([])
  })

  it('logs break edges and every byte in both directions', async () => {
    const h = await connect()
    const dirs = new Set(h.driver.log().map(e => e.dir))
    expect([...dirs].sort()).toEqual(['break-off', 'break-on', 'rx', 'tx'])
    expect(h.driver.log().some(e => e.dir === 'tx' && e.value === 0x7a)).toBe(true)
  })

  it('runs a read request and hands back the reply', async () => {
    const h = await connect(e => (e.dtcs = [[0x12, 0x00, 0x1e]]))
    expect(h.driver.request(readErrors())).toBe(true)
    await vi.advanceTimersByTimeAsync(500)
    expect(h.latest()?.reply?.blocks[0].data).toEqual([0x12, 0x00, 0x1e])
    h.driver.takeReply()
    expect(h.latest()?.reply).toBeNull()
  })

  it('refuses a request before the ECU answers', async () => {
    const port = new FakeKklPort(new EcuSim(T.wakeBitMs))
    const driver = await startDriver(port, { onSession: () => {}, onError: () => {} }, { clock: () => Date.now() })
    expect(driver.request(readErrors())).toBe(false)
    await driver.stop()
  })

  it('releases break and closes the port on stop', async () => {
    const h = await connect()
    await h.driver.stop()
    expect(h.port.breakOn).toBe(false)
    expect(h.port.closed).toBe(true)
    expect(h.latest()?.phase).toBe('off')
  })
})

describe('log export', () => {
  it('prints time from the first entry, direction and hex byte', () => {
    const text = formatLog([
      { atMs: 100, dir: 'break-on', value: null },
      { atMs: 112.25, dir: 'tx', value: 0x7a },
      { atMs: 115, dir: 'rx', value: 0x0f }
    ])
    expect(text.split('\n')).toEqual(['       0.0 break-on', '      12.3 tx        7A', '      15.0 rx        0F'])
  })
})

import { EcuSim, type Scheduled } from './ecu-sim'
import type { SerialPortLike } from './serial-driver'
import { MA17_TIMING } from './session'

const WAKE_BITS = 9
const PUMP_MS = 1

export const DEMO_FAULTS = [[0x02, 0x0a, 0x1e], [0x02, 0x03, 0x1e]]
export const DEMO_WIRELESS = { ssid: 'TEMPRA-DEMO', pass: 'demo-only', wifiClients: 0, bleClients: 0 }
export const DEMO_BATTERY_V = 12.6
export const DEMO_SENSORS = [0x51, 0x60, 0x0d, 0x9a, 0x80, 0x7f, 0x80, 0x22, 0xa4, 0x00]

export function createDemoEcu(): EcuSim {
  const ecu = new EcuSim(MA17_TIMING.wakeBitMs)
  ecu.dtcs = DEMO_FAULTS
  ecu.sensors = DEMO_SENSORS
  return ecu
}

export class DemoKklPort implements SerialPortLike {
  readable: ReadableStream<Uint8Array> | null = null
  writable: WritableStream<Uint8Array> | null = null
  opened: unknown = null
  closed = false
  breakOn = false
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private bus: Scheduled[] = []
  private wakeStartMs: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(readonly ecu: EcuSim = createDemoEcu()) {}

  async open(options: unknown): Promise<void> {
    this.opened = options
    this.readable = new ReadableStream<Uint8Array>({ start: c => void (this.controller = c) })
    this.writable = new WritableStream<Uint8Array>({
      write: chunk => {
        chunk.forEach(b => {
          this.bus.push({ atMs: Date.now() + 1, byte: b })
          this.ecu.receive(Date.now(), b)
        })
      }
    })
    this.timer = setInterval(() => this.pump(), PUMP_MS)
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.closed = true
  }

  async setSignals(signals: { break: boolean }): Promise<void> {
    this.breakOn = signals.break
    if (signals.break && this.wakeStartMs === null) this.wakeStartMs = Date.now()
  }

  private pump(): void {
    const now = Date.now()
    if (this.wakeStartMs !== null) {
      const ended = now >= this.wakeStartMs + MA17_TIMING.wakeBitMs * WAKE_BITS
      this.ecu.line(now, !ended, !this.breakOn)
      if (ended) this.wakeStartMs = null
    }
    this.ecu.tick(now)
    this.bus = [...this.bus, ...this.ecu.outbox].sort((a, b) => a.atMs - b.atMs)
    this.ecu.outbox = []
    const due = this.bus.filter(b => b.atMs <= now)
    this.bus = this.bus.filter(b => b.atMs > now)
    if (due.length > 0) this.controller?.enqueue(Uint8Array.from(due.map(b => b.byte)))
  }
}

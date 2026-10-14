import { SESSION_BAUD, hex, type Request } from './protocol'
import { MA17_TIMING, canRequest, initialSession, request, start, step, stop, takeReply, type Outputs, type Session, type Timing } from './session'

export const TICK_MS = 5
export const MAX_LOG_ENTRIES = 200_000

export interface SerialPortLike {
  open(options: { baudRate: number; dataBits: number; stopBits: number; parity: 'none' }): Promise<void>
  close(): Promise<void>
  setSignals(signals: { break: boolean }): Promise<void>
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
}

export type LogDirection = 'tx' | 'rx' | 'break-on' | 'break-off'

export interface LogEntry {
  readonly atMs: number
  readonly dir: LogDirection
  readonly value: number | null
}

export interface DriverEvents {
  onSession(s: Session): void
  onError(message: string): void
}

export interface DriverOptions {
  readonly clock?: () => number
  readonly timing?: Timing
}

export interface Driver {
  request(r: Request): boolean
  takeReply(): void
  stop(): Promise<void>
  log(): readonly LogEntry[]
}

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export function formatLog(entries: readonly LogEntry[]): string {
  const start = entries[0]?.atMs ?? 0
  return entries
    .map(e => `${(e.atMs - start).toFixed(1).padStart(10)} ${e.dir.padEnd(9)} ${e.value === null ? '' : hex([e.value])}`.trimEnd())
    .join('\n')
}

export async function startDriver(port: SerialPortLike, events: DriverEvents, options: DriverOptions = {}): Promise<Driver> {
  const clock = options.clock ?? (() => performance.now())
  const timing = options.timing ?? MA17_TIMING
  await port.open({ baudRate: SESSION_BAUD, dataBits: 8, stopBits: 1, parity: 'none' })
  if (!port.readable || !port.writable) throw new Error('Serial port has no data streams')

  const reader = port.readable.getReader()
  const writer = port.writable.getWriter()
  const rx: number[] = []
  const entries: LogEntry[] = []
  let session = start(initialSession(), clock())
  let breakOn = false
  let running = true

  const record = (dir: LogDirection, value: number | null): void => {
    if (entries.length < MAX_LOG_ENTRIES) entries.push({ atMs: clock(), dir, value })
  }

  const report = (error: unknown): void => {
    if (running) events.onError(errorMessage(error))
  }

  const setBreak = (on: boolean): void => {
    if (on === breakOn) return
    breakOn = on
    record(on ? 'break-on' : 'break-off', null)
    port.setSignals({ break: on }).catch(report)
  }

  const apply = (out: Outputs): void => {
    setBreak(out.driveLine && !out.lineHigh)
    if (out.tx === null) return
    record('tx', out.tx)
    writer.write(Uint8Array.of(out.tx)).catch(report)
  }

  const advance = (rxByte: number | null): void => {
    session = step(session, { nowMs: clock(), rx: rxByte }, timing)
    apply(session.out)
  }

  const tick = (): void => {
    const before = session
    while (rx.length > 0) advance(rx.shift() ?? null)
    advance(null)
    if (session !== before) events.onSession(session)
  }

  const readLoop = async (): Promise<void> => {
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done || !running) return
        value.forEach(b => {
          record('rx', b)
          rx.push(b)
        })
      }
    } catch (error: unknown) {
      report(error)
    }
  }

  const timer = setInterval(tick, TICK_MS)
  void readLoop()
  events.onSession(session)

  return {
    request(r: Request): boolean {
      if (!canRequest(session, r)) return false
      session = request(session, r)
      events.onSession(session)
      return true
    },
    takeReply(): void {
      session = takeReply(session)
      events.onSession(session)
    },
    async stop(): Promise<void> {
      clearInterval(timer)
      session = stop(session)
      events.onSession(session)
      running = false
      try {
        await port.setSignals({ break: false })
        await reader.cancel()
        reader.releaseLock()
        writer.releaseLock()
        await port.close()
      } catch (error: unknown) {
        events.onError(errorMessage(error))
      }
    },
    log: () => entries
  }
}

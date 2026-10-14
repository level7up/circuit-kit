import { ECU_ADDRESS, END_BYTE, TITLE, complement } from './protocol'

export const BYTE_GAP_MS = 3
export const KEYWORD_GAP_MS = 20
export const WAKE_TO_SYNC_MS = 40
export const LINK_WATCHDOG_MS = 1000
const IDENT_CHUNK = 10
const SENSOR_BYTES = 10

type State = 'asleep' | 'await-key' | 'sending' | 'receiving'

export interface Scheduled {
  atMs: number
  byte: number
}

export interface Faults {
  silent: boolean
  corruptNextComplement: boolean
  badEndOnce: boolean
  oversizeOnce: boolean
  nakNextRequest: boolean
}

export class EcuSim {
  keywords = [0x55, 0x46, 0x85, 0x89, 0xbc]
  ident = '0261200721BOSCH MA17'
  dtcs: number[][] = []
  memory: number[] = new Array(0x100).fill(0)
  sensors: number[] = new Array(SENSOR_BYTES).fill(0)
  faults: Faults = { silent: false, corruptNextComplement: false, badEndOnce: false, oversizeOnce: false, nakNextRequest: false }

  wakeAddresses: number[] = []
  keyReplies: number[] = []
  titlesReceived: number[] = []
  ackTimesMs: number[] = []
  drops = 0
  outbox: Scheduled[] = []

  private state: State = 'asleep'
  private counter = 0
  private queue: number[][] = []
  private out: number[] = []
  private outIndex = 0
  private incoming: number[] = []
  private lastActivityMs = 0
  private driving = false
  private levels: Array<[number, boolean]> = []

  constructor(private readonly wakeBitMs: number) {}

  line(nowMs: number, driven: boolean, high: boolean): void {
    if (driven) {
      this.driving = true
      this.levels.push([nowMs, high])
      return
    }
    if (!this.driving) return
    this.driving = false
    const address = this.decodeWake()
    this.levels = []
    this.wakeAddresses.push(address)
    if (address !== ECU_ADDRESS || this.faults.silent) return
    this.state = 'await-key'
    this.counter = 0
    this.queue = []
    this.lastActivityMs = nowMs
    this.keywords.forEach((k, i) => this.emit(nowMs + WAKE_TO_SYNC_MS + KEYWORD_GAP_MS * i, k))
  }

  receive(nowMs: number, b: number): void {
    this.lastActivityMs = nowMs
    if (this.state === 'await-key') return this.receiveKey(nowMs, b)
    if (this.state === 'sending') return this.receiveComplement(nowMs, b)
    if (this.state === 'receiving') this.receiveByte(nowMs, b)
  }

  tick(nowMs: number): void {
    if (this.state === 'receiving' && this.incoming.length === 0 && nowMs - this.lastActivityMs > LINK_WATCHDOG_MS) this.dropLink()
  }

  private receiveKey(nowMs: number, b: number): void {
    this.keyReplies.push(b)
    if (b !== complement(this.keywords[2])) return this.dropLink()
    for (let i = 0; i < this.ident.length; i += IDENT_CHUNK) {
      const part = this.ident.slice(i, i + IDENT_CHUNK)
      this.queue.push(this.frame(TITLE.ident, [...part].map(c => c.charCodeAt(0))))
    }
    this.sendNext(nowMs)
  }

  private receiveComplement(nowMs: number, b: number): void {
    if (b !== complement(this.out[this.outIndex])) return this.dropLink()
    this.outIndex += 1
    this.emit(nowMs + BYTE_GAP_MS, this.out[this.outIndex])
    if (this.outIndex === this.out.length - 1) {
      this.state = 'receiving'
      this.incoming = []
    }
  }

  private receiveByte(nowMs: number, b: number): void {
    this.incoming.push(b)
    if (this.incoming.length === this.incoming[0] + 1) return this.answer(nowMs)
    let ack = complement(b)
    if (this.faults.corruptNextComplement) {
      this.faults.corruptNextComplement = false
      ack ^= 0x01
    }
    this.emit(nowMs + BYTE_GAP_MS, ack)
  }

  private answer(nowMs: number): void {
    const title = this.incoming[2]
    const data = this.incoming.slice(3, -1)
    this.titlesReceived.push(title)
    if (title === TITLE.ack) {
      this.ackTimesMs.push(nowMs)
      return this.sendNext(nowMs)
    }
    if (this.faults.nakNextRequest) {
      this.faults.nakNextRequest = false
      return this.sendFrame(nowMs, this.frame(TITLE.nak, []))
    }
    if (title === TITLE.readErrors) {
      this.dtcs.forEach(d => this.queue.push(this.frame(TITLE.errorData, d)))
      return this.sendNext(nowMs)
    }
    if (title === TITLE.memoryRead && data.length === 3) {
      const start = data[2]
      return this.sendFrame(nowMs, this.frame(TITLE.memoryData, this.memory.slice(start, start + data[0])))
    }
    if (title === TITLE.sensorCollection) return this.sendFrame(nowMs, this.frame(TITLE.sensorData, this.sensors))
    this.sendFrame(nowMs, this.frame(TITLE.nak, []))
  }

  private frame(title: number, data: number[]): number[] {
    this.counter = (this.counter + 1) & 0xff
    return [data.length + 3, this.counter, title, ...data, END_BYTE]
  }

  private sendFrame(nowMs: number, f: number[]): void {
    const frame = [...f]
    if (this.faults.badEndOnce) {
      this.faults.badEndOnce = false
      frame[frame.length - 1] = 0x04
    }
    if (this.faults.oversizeOnce) {
      this.faults.oversizeOnce = false
      frame[0] = 0x20
    }
    this.out = frame
    this.outIndex = 0
    this.state = 'sending'
    this.emit(nowMs + BYTE_GAP_MS, frame[0])
  }

  private sendNext(nowMs: number): void {
    const next = this.queue.shift()
    this.sendFrame(nowMs, next ?? this.frame(TITLE.ack, []))
  }

  private dropLink(): void {
    this.state = 'asleep'
    this.queue = []
    this.drops += 1
  }

  private emit(atMs: number, byte: number): void {
    this.outbox.push({ atMs, byte })
  }

  private decodeWake(): number {
    const low = this.levels.find(([, high]) => !high)
    if (!low) return 0xff
    const levelAt = (t: number): boolean => this.levels.filter(([at]) => at <= t).at(-1)?.[1] ?? true
    let address = 0
    for (let bit = 0; bit < 8; bit++) {
      if (levelAt(low[0] + this.wakeBitMs * (bit + 1) + this.wakeBitMs / 2)) address |= 1 << bit
    }
    return address
  }
}

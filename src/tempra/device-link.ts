import type { WirelessInfo } from './device-screen'
import { MAX_BLOCKS, MAX_DATA, TITLE, type Reply } from './protocol'
import type { Fault, Phase } from './session'

export const COMMANDS = { faults: 'READ FAULTS', sensors: 'READ SENSORS' } as const
export type DeviceCommand = keyof typeof COMMANDS

export const NUS = {
  service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  rx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  tx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
} as const

export const WS_PATH = '/ws'
export const MAX_LINE = 1024
export const HIDDEN_PASS = '(on device)'

const PHASES: readonly Phase[] = ['off', 'wake', 'sync', 'keywords', 'link', 'ready', 'backoff']
const FAULTS: readonly Fault[] = ['none', 'no-sync', 'timeout', 'echo', 'complement', 'length', 'end-byte', 'unexpected-byte', 'too-many-blocks']

export interface DeviceState {
  readonly phase: Phase
  readonly fault: Fault
  readonly reconnects: number
  readonly ident: string | null
  readonly batteryV: number | null
  readonly wireless: WirelessInfo | null
}

export type DeviceMessage =
  | { readonly t: 'hello'; readonly fw: string }
  | { readonly t: 'state'; readonly state: DeviceState }
  | { readonly t: 'faults' | 'sensors'; readonly reply: Reply }

export const encodeCommand = (c: DeviceCommand): string => COMMANDS[c] + '\n'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isByte = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xff
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)

function parseState(m: Record<string, unknown>): DeviceState | null {
  if (!oneOf(PHASES, m.ph) || !oneOf(FAULTS, m.f) || !isCount(m.rc)) return null
  const ident = typeof m.id === 'string' && m.id.length > 0 ? m.id.slice(0, 64) : null
  const batteryV = typeof m.bat === 'number' && Number.isFinite(m.bat) ? m.bat : null
  const wireless = typeof m.ssid === 'string' && isCount(m.wc) && isCount(m.bc)
    ? { ssid: m.ssid.slice(0, 32), pass: HIDDEN_PASS, wifiClients: m.wc, bleClients: m.bc }
    : null
  return { phase: m.ph, fault: m.f, reconnects: m.rc, ident, batteryV, wireless }
}

function parseReply(m: Record<string, unknown>, kind: 'faults' | 'sensors'): Reply | null {
  const blocks = m.b
  if (!Array.isArray(blocks) || blocks.length > MAX_BLOCKS) return null
  if (!blocks.every(b => Array.isArray(b) && b.length <= MAX_DATA && b.every(isByte))) return null
  const title = kind === 'faults' ? TITLE.errorData : TITLE.sensorData
  return {
    purpose: kind === 'faults' ? 'read-errors' : 'read-sensors',
    rejected: m.rej === 1,
    blocks: (blocks as number[][]).map((data, i) => ({ counter: i + 1, title, data }))
  }
}

export function parseDeviceLine(line: string): DeviceMessage | null {
  if (line.length > MAX_LINE) return null
  let m: unknown
  try {
    m = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(m)) return null
  if (m.t === 'hello' && typeof m.fw === 'string') return { t: 'hello', fw: m.fw.slice(0, 64) }
  if (m.t === 'state') {
    const state = parseState(m)
    return state ? { t: 'state', state } : null
  }
  if (m.t === 'faults' || m.t === 'sensors') {
    const reply = parseReply(m, m.t)
    return reply ? { t: m.t, reply } : null
  }
  return null
}

export interface LineBuffer {
  readonly lines: readonly string[]
  readonly rest: string
}

export function splitLines(rest: string, chunk: string): LineBuffer {
  const parts = (rest + chunk).split('\n')
  const tail = parts.pop() ?? ''
  return { lines: parts.map(l => l.replace(/\r$/, '')).filter(l => l.length > 0), rest: tail.length > MAX_LINE ? '' : tail }
}

export interface DeviceTransport {
  send(line: string): Promise<void>
  close(): Promise<void>
}

export interface TransportEvents {
  onLine(line: string): void
  onClose(): void
}

export type TransportFactory = (events: TransportEvents) => Promise<DeviceTransport>

const lineFeeder = (events: TransportEvents): ((chunk: string) => void) => {
  let rest = ''
  return chunk => {
    const next = splitLines(rest, chunk)
    rest = next.rest
    next.lines.forEach(l => events.onLine(l))
  }
}

export const deviceSocketUrl = (loc: Pick<Location, 'host'>): string => `ws://${loc.host}${WS_PATH}`

export const webSocketTransport = (url: string): TransportFactory => events =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const feed = lineFeeder(events)
    let open = false
    ws.onopen = () => {
      open = true
      resolve({ send: async line => ws.send(line), close: async () => ws.close() })
    }
    ws.onmessage = e => {
      if (typeof e.data === 'string') feed(e.data)
    }
    ws.onerror = () => {
      if (!open) reject(new Error('Could not reach the device over Wi-Fi'))
    }
    ws.onclose = () => events.onClose()
  })

interface Characteristic {
  readonly value?: DataView | null
  startNotifications(): Promise<unknown>
  writeValue(data: BufferSource): Promise<void>
  addEventListener(type: 'characteristicvaluechanged', fn: () => void): void
}

interface BluetoothDeviceLike {
  readonly gatt?: {
    connect(): Promise<{ getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<Characteristic> }> }>
    disconnect(): void
  }
  addEventListener(type: 'gattserverdisconnected', fn: () => void): void
}

export interface BluetoothLike {
  requestDevice(options: { filters: { services: string[] }[] }): Promise<BluetoothDeviceLike>
}

export const bluetoothApi = (): BluetoothLike | null =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator ? (navigator as Navigator & { bluetooth: BluetoothLike }).bluetooth : null

export const bluetoothTransport = (bt: BluetoothLike): TransportFactory => async events => {
  const device = await bt.requestDevice({ filters: [{ services: [NUS.service] }] })
  if (!device.gatt) throw new Error('This device has no Bluetooth GATT server')
  const gatt = device.gatt
  const service = await (await gatt.connect()).getPrimaryService(NUS.service)
  const tx = await service.getCharacteristic(NUS.tx)
  const rx = await service.getCharacteristic(NUS.rx)
  const decoder = new TextDecoder()
  const feed = lineFeeder(events)
  tx.addEventListener('characteristicvaluechanged', () => {
    if (tx.value) feed(decoder.decode(tx.value))
  })
  await tx.startNotifications()
  device.addEventListener('gattserverdisconnected', () => events.onClose())
  const encoder = new TextEncoder()
  return { send: line => rx.writeValue(encoder.encode(line)), close: async () => gatt.disconnect() }
}

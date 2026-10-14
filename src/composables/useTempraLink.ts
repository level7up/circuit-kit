import { computed, onBeforeUnmount, shallowRef, type ComputedRef, type ShallowRef } from 'vue'
import { DEMO_BATTERY_V, DEMO_WIRELESS, DemoKklPort } from '../tempra/demo-port'
import { encodeCommand, parseDeviceLine, type DeviceCommand, type DeviceState, type DeviceTransport, type TransportFactory } from '../tempra/device-link'
import { viewOfSession, type WirelessInfo } from '../tempra/device-screen'
import { readErrors, readSensors, type Reply } from '../tempra/protocol'
import { errorMessage, formatLog, startDriver, type Driver, type LogEntry, type SerialPortLike } from '../tempra/serial-driver'
import { initialSession, isConnected, type Fault, type Phase, type Session } from '../tempra/session'

export interface SerialApi {
  requestPort(): Promise<SerialPortLike>
}

export type LinkSource = 'usb' | 'demo' | 'ble' | 'wifi'

export interface LinkView {
  readonly phase: Phase
  readonly fault: Fault
  readonly reconnects: number
  readonly ident: string | null
  readonly batteryV: number | null
  readonly wireless: WirelessInfo | null
}

export interface TempraLink {
  readonly supported: boolean
  readonly source: ShallowRef<LinkSource | null>
  readonly view: ComputedRef<LinkView>
  readonly faults: ShallowRef<Reply | null>
  readonly sensors: ShallowRef<Reply | null>
  readonly error: ShallowRef<string | null>
  readonly cancelled: ShallowRef<boolean>
  readonly firmware: ShallowRef<string | null>
  readonly logCount: ShallowRef<number>
  readonly active: ComputedRef<boolean>
  readonly connected: ComputedRef<boolean>
  readonly demo: ComputedRef<boolean>
  connect(): Promise<void>
  connectDemo(): Promise<void>
  connectDevice(factory: TransportFactory, source: 'ble' | 'wifi'): Promise<void>
  disconnect(): Promise<void>
  requestErrors(): boolean
  requestSensors(): boolean
  logText(): string
}

const serialApi = (): SerialApi | null =>
  typeof navigator !== 'undefined' && 'serial' in navigator ? (navigator as Navigator & { serial: SerialApi }).serial : null

const isUserCancel = (error: unknown): boolean => error instanceof DOMException && error.name === 'NotFoundError'

const OFF_STATE: DeviceState = { phase: 'off', fault: 'none', reconnects: 0, ident: null, batteryV: null, wireless: null }

export function useTempraLink(api: SerialApi | null = serialApi()): TempraLink {
  const source = shallowRef<LinkSource | null>(null)
  const session = shallowRef<Session>(initialSession())
  const deviceState = shallowRef<DeviceState>(OFF_STATE)
  const faults = shallowRef<Reply | null>(null)
  const sensors = shallowRef<Reply | null>(null)
  const error = shallowRef<string | null>(null)
  const cancelled = shallowRef(false)
  const firmware = shallowRef<string | null>(null)
  const logCount = shallowRef(0)
  let driver: Driver | null = null
  let transport: DeviceTransport | null = null
  let lastLog: readonly LogEntry[] = []

  const isWireless = (): boolean => source.value === 'ble' || source.value === 'wifi'
  const active = computed(() => source.value !== null)
  const demo = computed(() => source.value === 'demo')
  const connected = computed(() => (isWireless() ? deviceState.value.phase === 'ready' : isConnected(session.value)))
  const view = computed<LinkView>(() => {
    if (isWireless()) return deviceState.value
    return {
      ...viewOfSession(session.value),
      batteryV: demo.value ? DEMO_BATTERY_V : null,
      wireless: demo.value ? DEMO_WIRELESS : null
    }
  })

  const resetResults = (): void => {
    error.value = null
    cancelled.value = false
    faults.value = null
    sensors.value = null
    firmware.value = null
  }

  function onSession(s: Session): void {
    session.value = s
    logCount.value = driver?.log().length ?? logCount.value
    if (!s.reply) return
    if (s.reply.purpose === 'read-errors') faults.value = s.reply
    if (s.reply.purpose === 'read-sensors') sensors.value = s.reply
    driver?.takeReply()
  }

  async function open(getPort: () => Promise<SerialPortLike>, kind: 'usb' | 'demo'): Promise<void> {
    if (active.value) return
    resetResults()
    source.value = kind
    try {
      const port = await getPort()
      driver = await startDriver(port, { onSession, onError: m => (error.value = m) })
    } catch (e: unknown) {
      if (isUserCancel(e)) cancelled.value = true
      else error.value = errorMessage(e)
      driver = null
      source.value = null
    }
  }

  function onDeviceLine(line: string): void {
    const m = parseDeviceLine(line)
    if (!m) return
    if (m.t === 'hello') firmware.value = m.fw
    if (m.t === 'state') deviceState.value = m.state
    if (m.t === 'faults') faults.value = m.reply
    if (m.t === 'sensors') sensors.value = m.reply
  }

  function onDeviceClose(): void {
    transport = null
    deviceState.value = OFF_STATE
    source.value = null
  }

  async function connectDevice(factory: TransportFactory, kind: 'ble' | 'wifi'): Promise<void> {
    if (active.value) return
    resetResults()
    source.value = kind
    try {
      transport = await factory({ onLine: onDeviceLine, onClose: onDeviceClose })
    } catch (e: unknown) {
      if (isUserCancel(e)) cancelled.value = true
      else error.value = errorMessage(e)
      transport = null
      source.value = null
    }
  }

  async function disconnect(): Promise<void> {
    const d = driver
    const t = transport
    driver = null
    transport = null
    if (d) {
      lastLog = d.log()
      logCount.value = lastLog.length
      await d.stop()
    }
    if (t) await t.close().catch((e: unknown) => (error.value = errorMessage(e)))
    deviceState.value = OFF_STATE
    source.value = null
  }

  function sendCommand(c: DeviceCommand): boolean {
    if (!transport || !connected.value) return false
    transport.send(encodeCommand(c)).catch((e: unknown) => (error.value = errorMessage(e)))
    return true
  }

  const logText = (): string => formatLog(driver?.log() ?? lastLog)

  onBeforeUnmount(() => void disconnect())

  return {
    supported: api !== null,
    source,
    view,
    faults,
    sensors,
    error,
    cancelled,
    firmware,
    logCount,
    active,
    connected,
    demo,
    connect: async () => (api ? open(() => api.requestPort(), 'usb') : undefined),
    connectDemo: () => open(async () => new DemoKklPort(), 'demo'),
    connectDevice,
    disconnect,
    requestErrors: () => (isWireless() ? sendCommand('faults') : driver?.request(readErrors()) ?? false),
    requestSensors: () => (isWireless() ? sendCommand('sensors') : driver?.request(readSensors()) ?? false),
    logText
  }
}

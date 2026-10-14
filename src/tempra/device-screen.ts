import { decodeFault } from './faults'
import { identText, type Block, type Reply } from './protocol'
import { displayPhase, type Fault, type Phase, type Session } from './session'

export const OLED_COLUMNS = 21
export const OLED_ROWS = 8
const FAULT_ROWS = 5

export type ScreenPage = 'status' | 'faults' | 'sensors' | 'link'
export const SCREEN_PAGES: readonly ScreenPage[] = ['status', 'faults', 'sensors', 'link']
export const DEVICE_AP_IP = '192.168.4.1'

export const OLED_PHASE: Record<Phase, string> = {
  off: 'OFF',
  wake: 'WAKE 5 BAUD',
  sync: 'WAIT ECU',
  keywords: 'HANDSHAKE',
  link: 'LINK',
  ready: 'READY',
  backoff: 'RETRY'
}

export const OLED_FAULT: Record<Fault, string> = {
  none: 'NONE',
  'no-sync': 'NO ANSWER',
  timeout: 'TIMEOUT',
  echo: 'ECHO',
  complement: 'ACK BYTE',
  length: 'LENGTH',
  'end-byte': 'END BYTE',
  'unexpected-byte': 'UNEXPECTED',
  'too-many-blocks': 'TOO MANY'
}

export interface WirelessInfo {
  readonly ssid: string
  readonly pass: string
  readonly wifiClients: number
  readonly bleClients: number
}

export interface DeviceView {
  readonly phase: Phase
  readonly fault: Fault
  readonly reconnects: number
  readonly ident: string | null
  readonly faults: Reply | null
  readonly sensors: Reply | null
  readonly batteryV: number | null
  readonly wireless: WirelessInfo | null
  readonly page: ScreenPage
}

export const viewOfSession = (s: Session): Pick<DeviceView, 'phase' | 'fault' | 'reconnects' | 'ident'> => ({
  phase: displayPhase(s),
  fault: s.fault,
  reconnects: s.reconnects,
  ident: s.ident ? identText(s.ident) : null
})

const hexRun = (bytes: readonly number[]): string => bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0') + ' ').join('')

const wrap = (line: string): string[] =>
  line.length === 0 ? [''] : Array.from({ length: Math.ceil(line.length / OLED_COLUMNS) }, (_, i) => line.slice(i * OLED_COLUMNS, (i + 1) * OLED_COLUMNS))

function statusLines(v: DeviceView): string[] {
  return [
    'TEMPRA MA1.7',
    OLED_PHASE[v.phase],
    v.ident ? v.ident.slice(0, OLED_COLUMNS) : '-',
    v.batteryV === null ? 'BAT --' : `BAT ${v.batteryV.toFixed(1)}V (device)`,
    `ERR ${OLED_FAULT[v.fault]} R${v.reconnects}`,
    'PG  SENS  FAULTS'
  ]
}

function linkLines(w: WirelessInfo | null): string[] {
  if (!w) return ['WIRELESS OFF']
  return [`WIFI ${w.ssid}`, `PASS ${w.pass}`, `http://${DEVICE_AP_IP}`, `BT ${w.ssid}`, `CLIENTS W${w.wifiClients} B${w.bleClients}`]
}

function faultLine(b: Block): string {
  const r = decodeFault(b)
  if (r.code === null) return hexRun(b.data)
  return `${r.codeHex} ${r.info ? r.info.short : '?'}`
}

function faultLines(faults: Reply | null): string[] {
  if (!faults) return ['FAULTS: press button']
  if (faults.rejected) return ['FAULTS: REJECTED']
  return [`FAULTS ${faults.blocks.length} (unverified)`, ...faults.blocks.slice(0, FAULT_ROWS).map(faultLine)]
}

function sensorLines(sensors: Reply | null): string[] {
  if (!sensors || sensors.blocks.length === 0) return [sensors ? 'SENSORS: REJECTED' : 'SENSORS: press button']
  return ['SENSORS (raw)', hexRun(sensors.blocks[0].data)]
}

const PAGE_LINES: Record<ScreenPage, (v: DeviceView) => string[]> = {
  status: statusLines,
  faults: v => faultLines(v.faults),
  sensors: v => sensorLines(v.sensors),
  link: v => linkLines(v.wireless)
}

export const deviceScreen = (v: DeviceView): string[] => PAGE_LINES[v.page](v).flatMap(wrap).slice(0, OLED_ROWS)

export const nextPage = (page: ScreenPage): ScreenPage => SCREEN_PAGES[(SCREEN_PAGES.indexOf(page) + 1) % SCREEN_PAGES.length]

import { describe, expect, it } from 'vitest'
import FIRMWARE from '../firmware/tempra_diag/tempra_diag.ino?raw'
import { DEMO_FAULTS, DEMO_SENSORS } from '../src/tempra/demo-port'
import { OLED_COLUMNS, OLED_FAULT, OLED_PHASE, OLED_ROWS, deviceScreen, nextPage, viewOfSession, type DeviceView } from '../src/tempra/device-screen'
import { TITLE, type Reply } from '../src/tempra/protocol'
import { initialSession, type Session } from '../src/tempra/session'

const reply = (title: number, rows: number[][]): Reply => ({
  purpose: title === TITLE.errorData ? 'read-errors' : 'read-sensors',
  rejected: false,
  blocks: rows.map((data, i) => ({ counter: i + 1, title, data }))
})

const ready: Session = {
  ...initialSession(),
  phase: 'ready',
  ident: { purpose: 'ident', rejected: false, blocks: [{ counter: 1, title: TITLE.ident, data: [...'0261200721'].map(c => c.charCodeAt(0)) }] }
}

const view = (over: Partial<DeviceView> = {}): DeviceView => ({ ...viewOfSession(ready), faults: null, sensors: null, batteryV: 12.6, wireless: null, page: 'status', ...over })

const firmwareCases = (fn: string): string[] => {
  const body = FIRMWARE.slice(FIRMWARE.indexOf(fn + '('), FIRMWARE.indexOf('}\n}', FIRMWARE.indexOf(fn + '(')))
  return [...body.matchAll(/return "([^"]+)"/g)].map(m => m[1])
}

describe('handheld screen', () => {
  it('shows the status page the firmware draws', () => {
    expect(deviceScreen(view())).toEqual(['TEMPRA MA1.7', 'READY', '0261200721', 'BAT 12.6V (device)', 'ERR NONE R0', 'PG  SENS  FAULTS'])
  })

  it('uses the same phase and error words as the firmware', () => {
    expect([...firmwareCases('phaseText')].sort()).toEqual(Object.values(OLED_PHASE).sort())
    expect([...firmwareCases('faultText')].sort()).toEqual(Object.values(OLED_FAULT).sort())
  })

  it('stays on READY during a keep-alive exchange', () => {
    expect(deviceScreen(view(viewOfSession({ ...ready, phase: 'link', purpose: 'keep-alive' })))[1]).toBe('READY')
  })

  it('names the faults on the faults page', () => {
    const lines = deviceScreen(view({ page: 'faults', faults: reply(TITLE.errorData, DEMO_FAULTS) }))
    expect(lines).toEqual(['FAULTS 2 (unverified)', '0A02 COOLANT TEMP', '0302 CRANK SENSOR'])
  })

  it('asks for a button press before anything was read', () => {
    expect(deviceScreen(view({ page: 'faults' }))).toEqual(['FAULTS: press button'])
    expect(deviceScreen(view({ page: 'sensors' }))).toEqual(['SENSORS: press button'])
  })

  it('wraps raw sensor bytes at the screen width', () => {
    const lines = deviceScreen(view({ page: 'sensors', sensors: reply(TITLE.sensorData, [DEMO_SENSORS]) }))
    expect(lines[0]).toBe('SENSORS (raw)')
    expect(lines.slice(1).join('')).toBe('51 60 0D 9A 80 7F 80 22 A4 00 ')
  })

  it('never draws outside the 21 × 8 character screen', () => {
    const many = reply(TITLE.errorData, Array.from({ length: 8 }, () => [0x01, 0x1a, 0x1e]))
    ;(['status', 'faults', 'sensors', 'link'] as const).forEach(page => {
      const lines = deviceScreen(view({ page, faults: many, sensors: reply(TITLE.sensorData, [DEMO_SENSORS]), wireless: { ssid: 'TEMPRA-FFFF', pass: 'ffffffff', wifiClients: 4, bleClients: 1 } }))
      expect(lines.length, page).toBeLessThanOrEqual(OLED_ROWS)
      lines.forEach(l => expect(l.length, page + ': ' + l).toBeLessThanOrEqual(OLED_COLUMNS))
    })
  })

  it('cycles the pages like the page button', () => {
    expect(nextPage('status')).toBe('faults')
    expect(nextPage('faults')).toBe('sensors')
    expect(nextPage('sensors')).toBe('link')
    expect(nextPage('link')).toBe('status')
  })

  it('shows how to reach the device on the link page', () => {
    const lines = deviceScreen(view({ page: 'link', wireless: { ssid: 'TEMPRA-1A2B', pass: '1a2b3c4d', wifiClients: 1, bleClients: 0 } }))
    expect(lines).toEqual(['WIFI TEMPRA-1A2B', 'PASS 1a2b3c4d', 'http://192.168.4.1', 'BT TEMPRA-1A2B', 'CLIENTS W1 B0'])
    expect(deviceScreen(view({ page: 'link' }))).toEqual(['WIRELESS OFF'])
  })

  it('shows unknown battery as dashes when the device has not reported it', () => {
    expect(deviceScreen(view({ batteryV: null }))[3]).toBe('BAT --')
  })
})

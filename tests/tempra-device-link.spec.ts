import { describe, expect, it, vi } from 'vitest'
import FIXTURES from '../firmware/tempra_diag/test/link_fixtures.txt?raw'
import { HIDDEN_PASS, NUS, bluetoothTransport, deviceSocketUrl, encodeCommand, parseDeviceLine, splitLines, type BluetoothLike } from '../src/tempra/device-link'
import { TITLE } from '../src/tempra/protocol'

const fixtures: Record<string, string> = Object.fromEntries(
  FIXTURES.trim().split('\n').map(l => l.split('\t') as [string, string])
)

describe('device link messages', () => {
  it('parses every message the firmware fixture file defines', () => {
    expect(Object.keys(fixtures).sort()).toEqual(['faults', 'faults_rejected', 'hello', 'sensors', 'state_ready', 'state_retry'])
    Object.entries(fixtures).forEach(([name, line]) => expect(parseDeviceLine(line), name).not.toBeNull())
  })

  it('reads the device state', () => {
    expect(parseDeviceLine(fixtures.state_ready)).toEqual({
      t: 'state',
      state: { phase: 'ready', fault: 'none', reconnects: 0, ident: '0261200721BOSCH MA17', batteryV: 12.4, wireless: { ssid: 'TEMPRA-1A2B', pass: HIDDEN_PASS, wifiClients: 1, bleClients: 0 } }
    })
    const retry = parseDeviceLine(fixtures.state_retry)
    expect(retry?.t === 'state' && retry.state).toMatchObject({ phase: 'backoff', fault: 'no-sync', reconnects: 3, ident: null })
  })

  it('turns fault and sensor lines into replies the reports understand', () => {
    const faults = parseDeviceLine(fixtures.faults)
    expect(faults?.t === 'faults' && faults.reply.blocks.map(b => [b.title, b.data])).toEqual([[TITLE.errorData, [2, 10, 30]], [TITLE.errorData, [2, 3, 30]]])
    const sensors = parseDeviceLine(fixtures.sensors)
    expect(sensors?.t === 'sensors' && sensors.reply.blocks[0].data).toHaveLength(10)
    const rejected = parseDeviceLine(fixtures.faults_rejected)
    expect(rejected?.t === 'faults' && rejected.reply.rejected).toBe(true)
  })

  it('rejects anything malformed or out of range', () => {
    ;[
      'not json',
      '[]',
      '{"t":"state","ph":"hacked","f":"none","rc":0}',
      '{"t":"state","ph":"ready","f":"none","rc":-1}',
      '{"t":"faults","rej":0,"b":[[256]]}',
      '{"t":"faults","rej":0,"b":[[1.5]]}',
      '{"t":"faults","rej":0,"b":"x"}',
      '{"t":"sensors","rej":0,"b":[' + Array(9).fill('[1]').join(',') + ']}',
      '{"t":"faults","rej":0,"b":[[' + Array(13).fill(1).join(',') + ']]}',
      '{"t":"clear"}',
      '{"t":"hello"}',
      'x'.repeat(2000)
    ].forEach(line => expect(parseDeviceLine(line), line.slice(0, 40)).toBeNull())
  })

  it('only knows the two read-only commands', () => {
    expect(encodeCommand('faults')).toBe('READ FAULTS\n')
    expect(encodeCommand('sensors')).toBe('READ SENSORS\n')
  })
})

describe('line splitting', () => {
  it('joins chunks split anywhere, as Bluetooth notifications are', () => {
    const line = fixtures.state_ready + '\n' + fixtures.faults + '\n'
    let rest = ''
    const lines: string[] = []
    for (let i = 0; i < line.length; i += 20) {
      const next = splitLines(rest, line.slice(i, i + 20))
      rest = next.rest
      lines.push(...next.lines)
    }
    expect(lines).toEqual([fixtures.state_ready, fixtures.faults])
    expect(rest).toBe('')
  })

  it('drops CR and empty lines, and an overlong partial line', () => {
    expect(splitLines('', 'a\r\n\nb\n').lines).toEqual(['a', 'b'])
    expect(splitLines('', 'x'.repeat(2000)).rest).toBe('')
  })
})

describe('transports', () => {
  it('opens the WebSocket on the host that served the page', () => {
    expect(deviceSocketUrl({ host: '192.168.4.1' })).toBe('ws://192.168.4.1/ws')
  })

  it('talks to the Nordic UART service over Bluetooth', async () => {
    const listeners: Record<string, () => void> = {}
    const tx = {
      value: null as DataView | null,
      startNotifications: vi.fn(async () => undefined),
      writeValue: vi.fn(async () => undefined),
      addEventListener: (_: string, fn: () => void) => void (listeners.tx = fn)
    }
    const rx = { ...tx, writeValue: vi.fn(async (_data: BufferSource) => undefined), addEventListener: () => {} }
    const service = { getCharacteristic: vi.fn(async (uuid: string) => (uuid === NUS.tx ? tx : rx)) }
    const disconnect = vi.fn()
    const device = {
      gatt: { connect: async () => ({ getPrimaryService: vi.fn(async () => service) }), disconnect },
      addEventListener: (_: string, fn: () => void) => void (listeners.gone = fn)
    }
    const bt: BluetoothLike = { requestDevice: vi.fn(async () => device) }
    const lines: string[] = []
    const onClose = vi.fn()
    const link = await bluetoothTransport(bt)({ onLine: l => lines.push(l), onClose })

    expect(bt.requestDevice).toHaveBeenCalledWith({ filters: [{ services: [NUS.service] }] })
    const bytes = new TextEncoder().encode('{"t":"hello","fw":"x"}\n')
    tx.value = new DataView(bytes.buffer.slice(0, 10))
    listeners.tx()
    tx.value = new DataView(bytes.buffer.slice(10))
    listeners.tx()
    expect(lines).toEqual(['{"t":"hello","fw":"x"}'])

    await link.send('READ FAULTS\n')
    expect(new TextDecoder().decode(rx.writeValue.mock.calls[0][0] as Uint8Array)).toBe('READ FAULTS\n')
    listeners.gone()
    expect(onClose).toHaveBeenCalled()
    await link.close()
    expect(disconnect).toHaveBeenCalled()
  })
})

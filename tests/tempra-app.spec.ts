import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TempraApp from '../src/components/tempra/TempraApp.vue'
import type { SerialApi } from '../src/composables/useTempraLink'
import { STRINGS } from '../src/tempra/i18n'
import { MA17_TIMING as T } from '../src/tempra/session'
import { DemoKklPort as FakeKklPort } from '../src/tempra/demo-port'
import { EcuSim } from '../src/tempra/ecu-sim'
import type { TransportEvents, TransportFactory } from '../src/tempra/device-link'

const ar = STRINGS.ar
const CONNECT_MS = 3000

function fakeSerial(setup: (e: EcuSim) => void = () => {}): SerialApi {
  const ecu = new EcuSim(T.wakeBitMs)
  setup(ecu)
  return { requestPort: async () => new FakeKklPort(ecu) }
}

const STATE_READY = '{"t":"state","ph":"ready","f":"none","rc":0,"id":"0261200721BOSCH MA17","bat":12.4,"ssid":"TEMPRA-1A2B","wc":1,"bc":0}'

function fakeDevice() {
  const sent: string[] = []
  let events: TransportEvents | null = null
  const factory: TransportFactory = async e => {
    events = e
    return { send: async line => void sent.push(line), close: async () => events?.onClose() }
  }
  return { factory, sent, say: (line: string) => events?.onLine(line), close: () => events?.onClose() }
}

const buttonByText = (w: VueWrapper, text: string) => w.findAll('button').find(b => b.text() === text)

async function tickAll(w: VueWrapper): Promise<void> {
  for (const box of w.findAll('input[type="checkbox"]')) await box.setValue(true)
}

describe('Tempra web app', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('starts in Arabic, right to left', () => {
    const w = mount(TempraApp, { props: { serial: fakeSerial() } })
    expect(w.find('.tempra').attributes('dir')).toBe('rtl')
    expect(w.text()).toContain(ar.title)
  })

  it('switches to English, left to right, and remembers it', async () => {
    const w = mount(TempraApp, { props: { serial: fakeSerial() } })
    await buttonByText(w, ar.langSwitch)!.trigger('click')
    expect(w.find('.tempra').attributes('dir')).toBe('ltr')
    expect(w.text()).toContain(STRINGS.en.title)
    expect(mount(TempraApp, { props: { serial: fakeSerial() } }).text()).toContain(STRINGS.en.title)
  })

  it('explains when the browser has no USB serial support', () => {
    const w = mount(TempraApp, { props: { serial: null } })
    expect(w.find('[role="note"]').text()).toBe(ar.unsupported)
    expect(buttonByText(w, ar.connect)).toBeUndefined()
  })

  it('keeps Connect disabled until every safety check is ticked', async () => {
    const w = mount(TempraApp, { props: { serial: fakeSerial() } })
    expect(buttonByText(w, ar.connect)!.attributes('disabled')).toBeDefined()
    await tickAll(w)
    expect(buttonByText(w, ar.connect)!.attributes('disabled')).toBeUndefined()
  })

  it('connects, shows the ECU identification and reports stored faults', async () => {
    const w = mount(TempraApp, { props: { serial: fakeSerial(e => (e.dtcs = [[0x02, 0x0a, 0x1e], [0x12, 0x00, 0x1e]])) } })
    await tickAll(w)
    await buttonByText(w, ar.connect)!.trigger('click')
    await vi.advanceTimersByTimeAsync(CONNECT_MS)
    expect(w.text()).toContain(ar.phase.ready)
    expect(w.find('code').text()).toBe('0261200721BOSCH MA17')
    await buttonByText(w, ar.readErrors)!.trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    const faults = w.findAll('.fault')
    expect(faults).toHaveLength(2)
    expect(faults[0].text()).toContain('حساس حرارة المية')
    expect(faults[0].text()).toContain(ar.unverified)
    expect(faults[0].text()).toContain('0A02')
    expect(faults[1].text()).toContain(ar.unknownCode)
    expect(faults[1].text()).toContain('12 00 1E')
    expect(w.text()).toContain(ar.confidenceNote)
    expect(w.text()).toContain(ar.logTitle)
    w.unmount()
  })

  it('says so when no faults are stored', async () => {
    const w = mount(TempraApp, { props: { serial: fakeSerial() } })
    await tickAll(w)
    await buttonByText(w, ar.connect)!.trigger('click')
    await vi.advanceTimersByTimeAsync(CONNECT_MS)
    await buttonByText(w, ar.readErrors)!.trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    expect(w.text()).toContain(ar.noErrors)
    w.unmount()
  })

  it('runs a demo without a cable, a car or the safety checklist', async () => {
    const w = mount(TempraApp, { props: { serial: null } })
    await buttonByText(w, ar.demoButton)!.trigger('click')
    await vi.advanceTimersByTimeAsync(CONNECT_MS)
    expect(w.text()).toContain(ar.demoBanner)
    expect(w.text()).toContain(ar.phase.ready)
    await buttonByText(w, ar.readErrors)!.trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    expect(w.findAll('.fault').map(f => f.find('b').text())).toEqual(['حساس حرارة المية', 'حساس لفات الكرنك'])
    await buttonByText(w, ar.disconnect)!.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(w.text()).toContain(ar.demoTitle)
    w.unmount()
  })

  it('shows the handheld screen in the demo and drives it with its buttons', async () => {
    const w = mount(TempraApp, { props: { serial: null } })
    await buttonByText(w, ar.demoButton)!.trigger('click')
    await vi.advanceTimersByTimeAsync(CONNECT_MS)
    const rows = () => w.findAll('.oled .row').map(r => r.text())
    expect(rows().slice(0, 3)).toEqual(['TEMPRA MA1.7', 'READY', '0261200721BOSCH MA17'])
    await w.findAll('.keys button')[2].trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    expect(rows().slice(0, 3)).toEqual(['FAULTS 2 (unverified)', '0A02 COOLANT TEMP', '0302 CRANK SENSOR'])
    await w.findAll('.keys button')[0].trigger('click')
    expect(rows()[0]).toBe('SENSORS: press button')
    w.unmount()
  })

  it('controls the handheld over Wi-Fi with read-only commands', async () => {
    const dev = fakeDevice()
    const w = mount(TempraApp, { props: { serial: null, bluetooth: null, wifi: dev.factory, standalone: true } })
    expect(w.find('.links').exists()).toBe(false)
    await tickAll(w)
    await buttonByText(w, ar.wifiButton)!.trigger('click')
    await flushPromises()
    dev.say('{"t":"hello","fw":"tempra_diag 2"}')
    dev.say(STATE_READY)
    await flushPromises()
    expect(w.text()).toContain(ar.wirelessBanner + ' ' + ar.wifiLabel)
    expect(w.text()).toContain('tempra_diag 2')
    expect(w.findAll('.oled .row').map(r => r.text()).slice(0, 4)).toEqual(['TEMPRA MA1.7', 'READY', '0261200721BOSCH MA17', 'BAT 12.4V (device)'])
    await buttonByText(w, ar.readErrors)!.trigger('click')
    expect(dev.sent).toEqual(['READ FAULTS\n'])
    dev.say('{"t":"faults","rej":0,"b":[[2,10,30]]}')
    await flushPromises()
    expect(w.find('.fault b').text()).toBe('حساس حرارة المية')
    expect(w.findAll('.oled .row')[1].text()).toBe('0A02 COOLANT TEMP')
    dev.close()
    await flushPromises()
    expect(w.text()).toContain(ar.connectTitle)
  })

  it('connects to the handheld over Bluetooth when the browser supports it', async () => {
    const requestDevice = vi.fn()
    const w = mount(TempraApp, { props: { serial: null, bluetooth: { requestDevice } } })
    expect(w.text()).not.toContain(ar.bleUnsupported)
    await tickAll(w)
    expect(buttonByText(w, ar.bleButton)!.attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain(ar.wifiStep3)
  })

  it('explains Bluetooth is unavailable and points to Wi-Fi on iPhone-like browsers', () => {
    const w = mount(TempraApp, { props: { serial: null, bluetooth: null } })
    expect(w.text()).toContain(ar.bleUnsupported)
    expect(buttonByText(w, ar.bleButton)).toBeUndefined()
  })

  it('ignores malformed lines from the device', async () => {
    const dev = fakeDevice()
    const w = mount(TempraApp, { props: { serial: null, bluetooth: null, wifi: dev.factory, standalone: true } })
    await tickAll(w)
    await buttonByText(w, ar.wifiButton)!.trigger('click')
    await flushPromises()
    dev.say('{"t":"state","ph":"hacked"}')
    dev.say('not json')
    await flushPromises()
    expect(w.findAll('.oled .row')[1].text()).toBe('OFF')
  })

  it('reports a cancelled port picker without an error', async () => {
    const serial: SerialApi = { requestPort: () => Promise.reject(new DOMException('none', 'NotFoundError')) }
    const w = mount(TempraApp, { props: { serial } })
    await tickAll(w)
    await buttonByText(w, ar.connect)!.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(w.text()).toContain(ar.cancelled)
    expect(w.find('.note.bad').exists()).toBe(false)
  })
})

describe('Tempra strings', () => {
  it('has the same keys in Arabic and English', () => {
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v).map(x => `${k}.${x}`) : [k])).sort()
    expect(keys(STRINGS.en)).toEqual(keys(STRINGS.ar))
  })
})

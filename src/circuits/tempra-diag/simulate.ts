import type { SimControl, SimModel } from '../../types/circuit'
import { DEMO_FAULTS, DEMO_SENSORS, DEMO_WIRELESS } from '../../tempra/demo-port'
import { EcuSim, type Scheduled } from '../../tempra/ecu-sim'
import { deviceScreen, nextPage, viewOfSession, type ScreenPage } from '../../tempra/device-screen'
import { identText, readErrors, readSensors, type Reply } from '../../tempra/protocol'
import { MA17_TIMING, displayPhase, initialSession, isConnected, request, start, step as linkStep, takeReply, type Phase, type Session } from '../../tempra/session'

export const OFF = 0
export const ON = 1
export const ECU_OK = 0
export const ECU_SILENT = 1
export const ECU_NOISY = 2

export const D1_DROP_V = 0.9
export const K_LOW_V = 0.3
const K_DIVIDER = 10 / (47 + 10)
const R6_K = 100
const R7_K = 10
const R8_K = 470
const OUT_HIGH_V = 3.3
const REF_PARALLEL_K = 1 / (1 / R6_K + 1 / R7_K + 1 / R8_K)
const ADC_DIVIDER = 12 / (100 + 12)
const NOISE_EVERY_MS = 4000
const DEFAULT_BATTERY_V = 12.6
export const EXAMPLE_FAULTS = DEMO_FAULTS
export const EXAMPLE_SENSORS = DEMO_SENSORS

export interface TempraParams {
  key: number
  battery: number
  ecu: number
  faultsSeq: number
  sensorsSeq: number
  restartSeq: number
  pageSeq: number
}

type Talker = 0 | 1 | 2
interface BusByte extends Scheduled {
  fromEcu: boolean
}

export interface TempraState {
  t: number
  session: Session
  ecu: EcuSim
  bus: BusByte[]
  keyOn: boolean
  seenFaults: number
  seenSensors: number
  seenRestart: number
  seenPage: number
  page: ScreenPage
  faults: Reply | null
  sensors: Reply | null
  kLow: boolean
  talker: Talker
  nextNoiseMs: number
}

export const defaults: TempraParams = { key: ON, battery: DEFAULT_BATTERY_V, ecu: ECU_OK, faultsSeq: 0, sensorsSeq: 0, restartSeq: 0, pageSeq: 0 }

export const kHighV = (batteryV: number): number => Math.max(0, batteryV - D1_DROP_V)
export const thresholdV = (batteryV: number): number =>
  (REF_PARALLEL_K * (kHighV(batteryV) / R6_K + OUT_HIGH_V / R8_K)) / K_DIVIDER
export const adcV = (batteryV: number): number => kHighV(batteryV) * ADC_DIVIDER

function freshEcu(silent: boolean): EcuSim {
  const ecu = new EcuSim(MA17_TIMING.wakeBitMs)
  ecu.dtcs = EXAMPLE_FAULTS
  ecu.sensors = EXAMPLE_SENSORS
  ecu.faults.silent = silent
  return ecu
}

export function init(p: TempraParams = defaults): TempraState {
  return {
    t: 0,
    session: start(initialSession(), 0),
    ecu: freshEcu(p.key === OFF || p.ecu === ECU_SILENT),
    bus: [],
    keyOn: p.key === ON,
    seenFaults: p.faultsSeq,
    seenSensors: p.sensorsSeq,
    seenRestart: p.restartSeq,
    seenPage: p.pageSeq,
    page: 'status',
    faults: null,
    sensors: null,
    kLow: false,
    talker: 0,
    nextNoiseMs: NOISE_EVERY_MS
  }
}

const insert = (bus: BusByte[], item: BusByte): BusByte[] => {
  const at = bus.findIndex(b => b.atMs > item.atMs)
  return at < 0 ? [...bus, item] : [...bus.slice(0, at), item, ...bus.slice(at)]
}

function power(s: TempraState, p: TempraParams): TempraState {
  const keyOn = p.key === ON
  const silent = !keyOn || p.ecu === ECU_SILENT
  if (keyOn === s.keyOn && silent === s.ecu.faults.silent) return s
  return { ...s, keyOn, ecu: freshEcu(silent), bus: [] }
}

function restart(s: TempraState, p: TempraParams, nowMs: number): TempraState {
  if (p.restartSeq === s.seenRestart) return s
  return { ...init(p), t: s.t, session: start(initialSession(), nowMs), nextNoiseMs: nowMs + NOISE_EVERY_MS }
}

function requests(s: TempraState, p: TempraParams): TempraState {
  const wantsFaults = p.faultsSeq !== s.seenFaults
  const wantsSensors = p.sensorsSeq !== s.seenSensors
  const session = wantsFaults ? request(s.session, readErrors()) : wantsSensors ? request(s.session, readSensors()) : s.session
  const page = p.pageSeq !== s.seenPage ? nextPage(s.page) : s.page
  return { ...s, session, page, seenPage: p.pageSeq, seenFaults: p.faultsSeq, seenSensors: p.sensorsSeq }
}

function inject(s: TempraState, p: TempraParams, nowMs: number): TempraState {
  if (p.ecu !== ECU_NOISY || nowMs < s.nextNoiseMs) return s
  s.ecu.faults.corruptNextComplement = true
  return { ...s, nextNoiseMs: nowMs + NOISE_EVERY_MS }
}

function collect(s: TempraState): TempraState {
  const reply = s.session.reply
  if (!reply) return s
  const faults = reply.purpose === 'read-errors' ? reply : s.faults
  const sensors = reply.purpose === 'read-sensors' ? reply : s.sensors
  const page: ScreenPage = reply.purpose === 'read-errors' ? 'faults' : reply.purpose === 'read-sensors' ? 'sensors' : s.page
  return { ...s, faults, sensors, page, session: takeReply(s.session) }
}

function tick(s: TempraState, nowMs: number): TempraState {
  const due = s.bus.length > 0 && s.bus[0].atMs <= nowMs ? s.bus[0] : null
  const session = linkStep(s.session, { nowMs, rx: due ? due.byte : null }, MA17_TIMING)
  let bus = due ? s.bus.slice(1) : s.bus
  s.ecu.line(nowMs, session.out.driveLine, session.out.lineHigh)
  if (session.out.tx !== null) {
    bus = insert(bus, { atMs: nowMs + 1, byte: session.out.tx, fromEcu: false })
    s.ecu.receive(nowMs, session.out.tx)
  }
  s.ecu.tick(nowMs)
  bus = s.ecu.outbox.reduce((acc, b) => insert(acc, { ...b, fromEcu: true }), bus)
  s.ecu.outbox = []
  const talker: Talker = session.out.tx !== null ? 2 : due?.fromEcu ? 1 : 0
  const kLow = session.out.driveLine ? !session.out.lineHigh : talker !== 0
  return { ...s, session, bus, talker, kLow }
}

export function step(s: TempraState, p: TempraParams, dt: number): void {
  const t = s.t + dt
  const nowMs = Math.round(t * 1000)
  const next = collect(tick(inject(requests(power(restart({ ...s, t }, p, nowMs), p), p), p, nowMs), nowMs))
  Object.assign(s, next)
}

export const PHASE_LEVEL: Record<Phase, number> = { off: 0, backoff: 0.5, wake: 1, sync: 2, keywords: 3, link: 4, ready: 5 }

export const PHASE_TEXT: Record<Phase, string> = {
  off: 'مقفول',
  wake: 'بيصحّي الكمبيوتر (5 baud)',
  sync: 'مستني رد الكمبيوتر',
  keywords: 'بيتصافح',
  link: 'بيتبادل بيانات',
  ready: 'متوصل',
  backoff: 'الاتصال وقع: هيحاول تاني'
}

export const identOf = (s: TempraState): string => (s.session.ident ? identText(s.session.ident) : '—')

export const screenLines = (s: TempraState, p: TempraParams): string[] =>
  deviceScreen({ ...viewOfSession(s.session), faults: s.faults, sensors: s.sensors, batteryV: p.battery, wireless: DEMO_WIRELESS, page: s.page })

const controls: SimControl<TempraParams>[] = [
  {
    key: 'key',
    label: 'مفتاح العربية',
    options: [ON, OFF],
    format: v => (v === ON ? 'ON (الموتور مطفي)' : 'مقفول'),
    get: p => p.key,
    set: (p, v) => ({ ...p, key: v }),
    hint: p => (p.key === ON ? 'الكمبيوتر شغال وبيرد.' : 'الكمبيوتر مطفي: الجهاز هيصحّيه كل كام ثانية ومحدش هيرد.'),
    isDefault: v => v === ON
  },
  {
    key: 'battery',
    label: 'جهد البطارية',
    options: [9, DEFAULT_BATTERY_V, 14.4],
    format: v => v.toFixed(1) + 'V',
    get: p => p.battery,
    set: (p, v) => ({ ...p, battery: v }),
    hint: p => `خط K عالي = ${kHighV(p.battery).toFixed(1)}V، والعتبة ≈ ${thresholdV(p.battery).toFixed(1)}V: نص الجهد تقريباً، فالقراية سليمة في الحالات الثلاثة.`,
    isDefault: v => v === DEFAULT_BATTERY_V
  },
  {
    key: 'ecu',
    label: 'جرّب مشكلة',
    options: [ECU_OK, ECU_SILENT, ECU_NOISY],
    format: v => (v === ECU_OK ? 'مفيش' : v === ECU_SILENT ? 'السلك على الرجل الغلط' : 'شوشرة على الخط'),
    get: p => p.ecu,
    set: (p, v) => ({ ...p, ecu: v }),
    hint: p =>
      p.ecu === ECU_SILENT
        ? 'مفيش رد على الإيقاظ: الجهاز بيستنى 2.6 ثانية ويحاول تاني، ومن غير ما يبعت أي حاجة تانية.'
        : p.ecu === ECU_NOISY
          ? 'كل 4 ثواني بايت تأكيد بيوصل غلط: الجهاز بيقفل الاتصال ويبدأ من الأول بدل ما يكمّل على بيانات غلط.'
          : 'كمبيوتر محاكَى بيانات مثال بس، مش أعطال عربيتك.',
    isDefault: v => v === ECU_OK
  }
]

export const tempraSim: SimModel<TempraParams, TempraState> = {
  title: 'المحاكي: الاتصال بالكمبيوتر',
  sub: 'نفس كود البروتوكول اللي في البرنامج بالظبط، شغال قدامك مع كمبيوتر محاكَى.',
  note: 'الإيقاظ بياخد حوالي 2 ثانية: كل "سنّة" في خط K طولها 200 ms. بعدها الكمبيوتر يرد ويبدأ تبادل البايتات بسرعة 4800.',
  footnote: 'خط K هنا مبسّط: كل بايت بيظهر شَرطة لتحت بدل الـ 10 بِتّات بتوعه. "مين بيتكلم": فوق = الجهاز، تحت = الكمبيوتر. البيانات مثال من الكمبيوتر المحاكَى، مش من عربيتك.',
  defaults,
  controls,
  traces: [
    { key: 'k', label: 'خط K (فولت)', color: '#ffb547', height: 60, max: 15, value: s => (s.kLow ? K_LOW_V : kHighV(DEFAULT_BATTERY_V)), fill: true, threshold: { value: thresholdV(DEFAULT_BATTERY_V), label: 'العتبة' } },
    { key: 'who', label: 'مين بيتكلم', color: '#5aa9ff', height: 34, max: 2, value: s => s.talker, fill: true },
    { key: 'phase', label: 'مرحلة الاتصال', color: '#3ddc97', height: 40, max: 5, value: s => PHASE_LEVEL[s.session.phase], fill: true }
  ],
  readouts: [
    { label: 'الحالة', value: s => PHASE_TEXT[displayPhase(s.session)] },
    { label: 'تعريف الكمبيوتر', value: s => identOf(s) },
    { label: 'خط K عالي', value: (_s, p) => kHighV(p.battery).toFixed(2) + 'V' },
    { label: 'عتبة LM393', value: (_s, p) => thresholdV(p.battery).toFixed(2) + 'V' },
    { label: 'رجل GPIO34', value: (_s, p) => adcV(p.battery).toFixed(2) + 'V' },
    { label: 'مرات إعادة الاتصال', value: s => String(s.session.reconnects) }
  ],
  init,
  step,
  brightness: s => (isConnected(s.session) ? 1 : 0.15),
  netReading: () => '—'
}

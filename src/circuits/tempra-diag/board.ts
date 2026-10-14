import type { Hole, NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const POWER = 2
export const KLINE_TX = 3
export const KLINE_RX = 4
export const SENSE = 5
export const SOCKET = 6
export const LEADS = 7

export const ESP32_PINS = 30
const ESP_LEFT_X = 23
const ESP_RIGHT_X = 33
const ESP_TOP_Y = 4

export const ESP_NETS = [
  'nEN', 'nVP', 'nVN', 'VBS', 'nD35', 'BPG', 'BSN', 'BFT', 'TX', 'RX', 'SCL', 'nD12', 'SDA', 'GND', 'V5',
  'V33', 'GND', 'nD15', 'nD2', 'nD4', 'nRX2', 'nTX2', 'nD5', 'nD18', 'nD19', 'nD21', 'nRX0', 'nTX0', 'nD22', 'nD23'
]

export const ESP_GPIO: Record<string, number> = { VBS: 34, BPG: 32, BSN: 33, BFT: 25, TX: 26, RX: 27, SCL: 14, SDA: 13 }

const espLegs: Hole[] = Array.from({ length: ESP32_PINS }, (_, i): Hole =>
  i < ESP32_PINS / 2 ? [ESP_LEFT_X, ESP_TOP_Y + i] : [ESP_RIGHT_X, ESP_TOP_Y + ESP32_PINS - 1 - i])
export const espPin = (n: number): Hole => espLegs[n - 1]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const col = (x: number): string => (x < LETTERS.length ? LETTERS[x] : 'A' + LETTERS[x - LETTERS.length])
export const tag = ([x, y]: Hole): string => '⟦' + col(x) + (y + 1) + '⟧'

export const nets: Record<string, NetDef> = {
  VB: { n: 'البطارية بعد الفيوز (قبل D1)', c: '#e5484d' },
  VK: { n: 'VK: البطارية بعد الحماية', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  V5: { n: '5V من موديول LM2596', c: '#ff9f43' },
  V33: { n: '3.3V من الـ ESP32', c: '#fbbf24' },
  K: { n: 'خط K (للعربية)', c: '#f97316' },
  TX: { n: 'إرسال من GPIO26', c: '#f472b6' },
  TXB: { n: 'قاعدة Q1', c: '#e879f9' },
  RX: { n: 'استقبال لـ GPIO27', c: '#5aa9ff' },
  KDIV: { n: 'خط K مقسوم (IN−)', c: '#93c5fd' },
  REF: { n: 'العتبة (IN+)', c: '#a78bfa' },
  VBS: { n: 'قياس البطارية لـ GPIO34', c: '#34d399' },
  BPG: { n: 'زرار صفحة ← GPIO32', c: '#c084fc' },
  BSN: { n: 'زرار حساسات ← GPIO33', c: '#c084fc' },
  BFT: { n: 'زرار أعطال ← GPIO25', c: '#c084fc' },
  SCL: { n: 'SCL للشاشة (GPIO14)', c: '#10b981' },
  SDA: { n: 'SDA للشاشة (GPIO13)', c: '#22d3ee' }
}

const pad = (id: string, s: number, at: Hole, net: string, lab: string, val: string, tip: string, face?: PerfPart['face']): PerfPart =>
  ({ id, k: 'pad', s, legs: [at], nets: [net], lab, val, color: nets[net].c, tip, ...(face ? { face } : {}) })

const jumper = (id: string, s: number, a: Hole, b: Hole, net: string): PerfPart =>
  ({ id, k: 'wire', s, legs: [a, b], nets: [net, net], lab: id, val: 'سلك فوق', color: nets[net].c,
    tip: 'سلك معزول فوق البورد من ' + tag(a) + ' لـ ' + tag(b) + ': بيعدّي من فوق الخطوط اللي تحت.' })

const U2_LEGS: Hole[] = [[14, 18], [15, 18], [16, 18], [17, 18], [17, 15], [16, 15], [15, 15], [14, 15]]

const parts: PerfPart[] = [
  pad('PVB', POWER, [0, 0], 'VB', 'BAT', 'سلك البطارية', 'السلك الأحمر من رجل 16 في فيشة OBD (بعد فيوز 1A)، في ' + tag([0, 0]) + '.'),
  pad('PGND', POWER, [0, 2], 'GND', 'GND', 'سلك الأرضي', 'السلك الأسود من رجل 4 و5 في فيشة OBD، في ' + tag([0, 2]) + '.'),
  pad('PMIN', POWER, [0, 4], 'GND', 'IN−', 'لموديول LM2596', 'لـ IN− في موديول LM2596، في ' + tag([0, 4]) + '.'),
  pad('PMIP', POWER, [13, 0], 'VK', 'IN+', 'لموديول LM2596', 'لـ IN+ في موديول LM2596، في ' + tag([13, 0]) + '.'),
  { id: 'D1', k: 'diode', s: POWER, legs: [[1, 0], [4, 0]], nets: ['VB', 'VK'], lab: 'D1', val: '1N5408', labelAt: [0, 1],
    tip: 'نايم من ' + tag([1, 0]) + ' لـ ' + tag([4, 0]) + '. الشريطة ناحية اليمين (' + tag([4, 0]) + '). بيمنع الكهربا لو الأحمر والأسود اتعكسوا.' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[5, 3], [5, 0]], nets: ['GND', 'VK'], lab: 'D2', val: 'P6KE18A', labelAt: [0.9, 1.4],
    tip: 'واقف من ' + tag([5, 3]) + ' لـ ' + tag([5, 0]) + '. الشريطة لفوق (' + tag([5, 0]) + '). بيشرب أي نبضة عالية على البطارية.' },
  { id: 'C1', k: 'can', s: POWER, legs: [[7, 0], [7, 2]], nets: ['VK', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) في ' + tag([7, 0]) + '، والشريطة (−) في ' + tag([7, 2]) + '.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[9, 0], [9, 1]], nets: ['VK', 'GND'], lab: 'C2', val: '100nF', labelAt: [0.8, 0],
    tip: 'بين ' + tag([9, 0]) + ' و' + tag([9, 1]) + '. ملوش اتجاه.' },

  { id: 'R1', k: 'res', s: KLINE_TX, legs: [[11, 0], [11, 6]], nets: ['VK', 'K'], lab: 'R1', val: '470Ω 1W', ohm: 470, labelAt: [0.9, 0],
    tip: 'واقفة بالطول من ' + tag([11, 0]) + ' لـ ' + tag([11, 6]) + '، مرفوعة 3 مم لأنها بتسخن شوية. هي اللي بتشد خط K لفوق.' },
  { id: 'D3', k: 'tvs', s: KLINE_TX, legs: [[3, 9], [3, 6]], nets: ['GND', 'K'], lab: 'D3', val: 'P6KE18A', labelAt: [-0.9, 1.4],
    tip: 'واقف من ' + tag([3, 9]) + ' لـ ' + tag([3, 6]) + '. الشريطة لفوق (' + tag([3, 6]) + '، على خط K). بيحمي الدايرة من نبضات العربية.' },
  { id: 'Q1', k: 'to92', s: KLINE_TX, legs: [[6, 9], [6, 8], [6, 7]], nets: ['GND', 'TXB', 'K'], lab: 'Q1', val: '2N2222A', face: 'right',
    tip: 'رجوله بالطول: <b>E</b> في ' + tag([6, 9]) + '، و<b>B</b> في ' + tag([6, 8]) + '، و<b>C</b> في ' + tag([6, 7]) + '. الوش المسطح يمين. بيشد خط K للأرضي لما الـ ESP32 يبعت.' },
  { id: 'R3', k: 'resUp', s: KLINE_TX, legs: [[5, 8], [5, 9]], nets: ['TXB', 'GND'], lab: 'R3', val: '10kΩ', ohm: 10e3, labelAt: [-1, 0],
    tip: 'واقفة بين ' + tag([5, 8]) + ' و' + tag([5, 9]) + '. بتقفل Q1 لو الـ ESP32 مش شغال، فخط K ميفضلش واطي.' },
  { id: 'R2', k: 'res', s: KLINE_TX, legs: [[7, 8], [10, 8]], nets: ['TXB', 'TX'], lab: 'R2', val: '2.2kΩ', ohm: 2.2e3,
    tip: 'نايمة من ' + tag([7, 8]) + ' لـ ' + tag([10, 8]) + '. بتحدد تيار قاعدة Q1.' },
  pad('PK', KLINE_TX, [1, 6], 'K', 'K', 'لرجل 7 في OBD', 'السلك الأصفر رايح لرجل 7 في فيشة OBD (خط K)، في ' + tag([1, 6]) + '.'),

  { id: 'U2', k: 'dip', s: KLINE_RX, legs: U2_LEGS, nets: ['RX', 'KDIV', 'REF', 'GND', 'GND', 'GND', 'nOUTB', 'V5'], lab: 'U2', val: 'سوكيت 8 رجول', chip: 'LM393',
    tip: 'سوكيت 8 رجول: رجل 1 في ' + tag(U2_LEGS[0]) + ' (تحت شمال)، والعلامة (النص دايرة) ناحية الشمال.' },
  { id: 'R4', k: 'res', s: KLINE_RX, legs: [[9, 21], [12, 21]], nets: ['K', 'KDIV'], lab: 'R4', val: '47kΩ', ohm: 47e3,
    tip: 'نايمة من ' + tag([9, 21]) + ' (خط K) لـ ' + tag([12, 21]) + '.' },
  { id: 'R5', k: 'resUp', s: KLINE_RX, legs: [[15, 22], [15, 23]], nets: ['KDIV', 'GND'], lab: 'R5', val: '10kΩ', ohm: 10e3, labelAt: [-1, 0],
    tip: 'واقفة بين ' + tag([15, 22]) + ' و' + tag([15, 23]) + '. مع R4 بتنزّل خط K لحوالي 2V.' },
  { id: 'R6', k: 'res', s: KLINE_RX, legs: [[20, 20], [16, 20]], nets: ['VK', 'REF'], lab: 'R6', val: '100kΩ', ohm: 100e3, labelAt: [0, 1],
    tip: 'نايمة من ' + tag([20, 20]) + ' لـ ' + tag([16, 20]) + '.' },
  { id: 'R7', k: 'resUp', s: KLINE_RX, legs: [[16, 22], [17, 22]], nets: ['REF', 'GND'], lab: 'R7', val: '10kΩ', ohm: 10e3, labelAt: [0, 1],
    tip: 'واقفة بين ' + tag([16, 22]) + ' و' + tag([17, 22]) + '. مع R6 بتعمل العتبة: نص جهد البطارية تقريباً.' },
  { id: 'R8', k: 'res', s: KLINE_RX, legs: [[13, 19], [16, 19]], nets: ['RX', 'REF'], lab: 'R8', val: '470kΩ', ohm: 470e3, labelAt: [0, 1],
    tip: 'نايمة من ' + tag([13, 19]) + ' لـ ' + tag([16, 19]) + '. بتدّي العتبة "رجعة" صغيرة عشان القراية متترعشش.' },
  { id: 'C3', k: 'ceramic', s: KLINE_RX, legs: [[19, 18], [19, 19]], nets: ['V5', 'GND'], lab: 'C3', val: '100nF', labelAt: [0.8, 0],
    tip: 'بين ' + tag([19, 18]) + ' و' + tag([19, 19]) + '. للتغذية بتاعة الـ LM393.' },
  jumper('JVK', KLINE_RX, [20, 0], [20, 19], 'VK'),

  { id: 'R10', k: 'res', s: SENSE, legs: [[18, 0], [18, 5]], nets: ['VK', 'VBS'], lab: 'R10', val: '100kΩ', ohm: 100e3, labelAt: [-0.9, 0],
    tip: 'واقفة بالطول من ' + tag([18, 0]) + ' لـ ' + tag([18, 5]) + '. بتاخد جهد البطارية بعد D1.' },
  { id: 'R11', k: 'resUp', s: SENSE, legs: [[17, 5], [17, 4]], nets: ['VBS', 'GND'], lab: 'R11', val: '12kΩ', ohm: 12e3, labelAt: [0, -1],
    tip: 'واقفة بين ' + tag([17, 5]) + ' و' + tag([17, 4]) + '. مع R10 بتقسم الجهد على 9.3.' },
  { id: 'C4', k: 'ceramic', s: SENSE, legs: [[16, 5], [16, 4]], nets: ['VBS', 'GND'], lab: 'C4', val: '100nF', labelAt: [-0.8, -0.6],
    tip: 'بين ' + tag([16, 5]) + ' و' + tag([16, 4]) + '.' },

  pad('PMOP', LEADS, [18, 24], 'V5', 'OUT+', 'من LM2596', 'من OUT+ في موديول LM2596 (مظبوط 5.00V)، في ' + tag([18, 24]) + '.', 'down'),
  pad('PBPG', LEADS, [22, 9], 'BPG', 'PAGE', 'زرار صفحة', 'لرجل من زرار الصفحة، في ' + tag([22, 9]) + '.'),
  pad('PBSN', LEADS, [22, 10], 'BSN', 'SENS', 'زرار حساسات', 'لرجل من زرار الحساسات، في ' + tag([22, 10]) + '.'),
  pad('PBFT', LEADS, [22, 11], 'BFT', 'FLT', 'زرار أعطال', 'لرجل من زرار الأعطال، في ' + tag([22, 11]) + '.'),
  pad('PSCL', LEADS, [22, 14], 'SCL', 'SCL', 'للشاشة', 'لرجل SCL في الشاشة، في ' + tag([22, 14]) + '.'),
  pad('PSDA', LEADS, [22, 16], 'SDA', 'SDA', 'للشاشة', 'لرجل SDA في الشاشة، في ' + tag([22, 16]) + '.'),
  pad('PV33', LEADS, [33, 21], 'V33', '3V3', 'VCC الشاشة', 'لرجل VCC في الشاشة، في ' + tag([33, 21]) + '.'),
  pad('PBG', LEADS, [22, 25], 'GND', 'GND', 'الزراير والشاشة', 'الرجل التانية في التلات زراير + GND الشاشة، في ' + tag([22, 25]) + '.'),
  { id: 'U1', k: 'dip', s: SOCKET, legs: espLegs, nets: ESP_NETS, lab: 'U1', val: 'هيدر أنثى 2 × 15', chip: 'ESP32',
    tip: 'هيدرين 15 رجل بالطول، بينهم 10 خرمات: واحد من ' + tag(espPin(1)) + ' لـ ' + tag(espPin(15)) + '، والتاني من ' + tag(espPin(30)) + ' لـ ' + tag(espPin(16)) + '. الهوائي لفوق والـ USB لتحت.' },
  { id: 'C5', k: 'ceramic', s: SOCKET, legs: [[21, 18], [21, 19]], nets: ['V5', 'GND'], lab: 'C5', val: '100nF', labelAt: [-0.9, 0.6],
    tip: 'بين ' + tag([21, 18]) + ' و' + tag([21, 19]) + '. جنب VIN في الـ ESP32.' },
  jumper('JG', SOCKET, [22, 17], [22, 19], 'GND')
]

const t = (net: string, s: number, ...pts: Hole[]): PerfTrace => ({ net, s, pts })

const traces: PerfTrace[] = [
  t('VB', POWER, [0, 0], [1, 0]),
  t('VK', POWER, [4, 0], [13, 0]),
  t('GND', POWER, [0, 2], [0, 25]),
  t('GND', POWER, [0, 3], [9, 3]),
  t('GND', POWER, [7, 2], [7, 3]),
  t('GND', POWER, [9, 1], [9, 3]),

  t('K', KLINE_TX, [1, 6], [11, 6]),
  t('K', KLINE_TX, [6, 6], [6, 7]),
  t('GND', KLINE_TX, [0, 9], [6, 9]),
  t('TXB', KLINE_TX, [5, 8], [7, 8]),

  t('K', KLINE_RX, [9, 6], [9, 21]),
  t('KDIV', KLINE_RX, [12, 21], [15, 21], [15, 18]),
  t('KDIV', KLINE_RX, [15, 21], [15, 22]),
  t('REF', KLINE_RX, [16, 18], [16, 22]),
  t('GND', KLINE_RX, [16, 15], [17, 15], [17, 25]),
  t('GND', KLINE_RX, [0, 25], [22, 25]),
  t('GND', KLINE_RX, [15, 23], [17, 23]),
  t('GND', KLINE_RX, [19, 19], [19, 25]),
  t('V5', KLINE_RX, [19, 18], [18, 18], [18, 14], [14, 14], [14, 15]),
  t('VK', KLINE_RX, [13, 0], [20, 0]),
  t('VK', KLINE_RX, [20, 19], [20, 20]),

  t('GND', SENSE, [9, 3], [21, 3]),
  t('GND', SENSE, [17, 3], [17, 4]),
  t('GND', SENSE, [16, 3], [16, 4]),
  t('VBS', SENSE, [16, 5], [22, 5], [22, 7], [23, 7]),

  t('TX', SOCKET, espPin(9), [11, 12], [11, 8], [10, 8]),
  t('RX', SOCKET, espPin(10), [13, 13], [13, 19]),
  t('RX', SOCKET, [13, 18], [14, 18]),
  t('V5', SOCKET, espPin(15), [19, 18]),
  t('GND', SOCKET, espPin(17), [23, 17], [22, 17]),
  t('GND', SOCKET, [21, 19], [22, 19], [22, 25]),
  t('V33', SOCKET, espPin(16), [33, 21]),

  t('V5', LEADS, [18, 18], [18, 24]),
  t('BPG', LEADS, espPin(6), [22, 9]),
  t('BSN', LEADS, espPin(7), [22, 10]),
  t('BFT', LEADS, espPin(8), [22, 11]),
  t('SCL', LEADS, espPin(11), [22, 14]),
  t('SDA', LEADS, espPin(13), [22, 16]),
]

export const SCHEMATIC: Record<string, string[]> = {
  U1: ESP_NETS,
  U2: ['RX', 'KDIV', 'REF', 'GND', 'GND', 'GND', 'nOUTB', 'V5'],
  D1: ['VB', 'VK'], D2: ['GND', 'VK'], C1: ['VK', 'GND'], C2: ['VK', 'GND'],
  R1: ['VK', 'K'], D3: ['GND', 'K'], Q1: ['GND', 'TXB', 'K'], R2: ['TXB', 'TX'], R3: ['TXB', 'GND'],
  R4: ['K', 'KDIV'], R5: ['KDIV', 'GND'], R6: ['VK', 'REF'], R7: ['REF', 'GND'], R8: ['RX', 'REF'], C3: ['V5', 'GND'],
  R10: ['VK', 'VBS'], R11: ['VBS', 'GND'], C4: ['VBS', 'GND'], C5: ['V5', 'GND']
}

export const diagLayout: PerfLayout = { cols: 34, rows: 26, parts, traces, nets }

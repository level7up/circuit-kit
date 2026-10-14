import type { Hole, PerfLayout, PerfPart, StripCut } from '../../types/circuit'
import { ESP_NETS, KLINE_RX, KLINE_TX, LEADS, POWER, SENSE, SOCKET, espPin, nets, tag } from './board'

const ESP_ROWS = Array.from({ length: 15 }, (_, i) => 4 + i)
const ESP_GND_ROW = 17
const BETWEEN_HEADERS = 28
const U2_LEGS: Hole[] = [[5, 9], [5, 10], [5, 11], [5, 12], [8, 12], [8, 11], [8, 10], [8, 9]]

const span = (legs: Hole[]): string => (legs.length === 1 ? tag(legs[0]) : 'من ' + tag(legs[0]) + ' لـ ' + tag(legs[legs.length - 1]))

const part = (id: string, k: PerfPart['k'], s: number, legs: Hole[], partNets: string[], val: string, role: string, extra: Partial<PerfPart> = {}): PerfPart =>
  ({ id, k, s, legs, nets: partNets, lab: id, val, tip: span(legs) + '. ' + role, ...extra })

const pad = (id: string, s: number, at: Hole, net: string, lab: string, val: string, role: string, face?: PerfPart['face']): PerfPart =>
  ({ id, k: 'pad', s, legs: [at], nets: [net], lab, val, color: nets[net].c, tip: role + '، في ' + tag(at) + '.', ...(face ? { face } : {}) })

const link = (id: string, s: number, a: Hole, b: Hole, net: string): PerfPart =>
  ({ id, k: 'wire', s, legs: [a, b], nets: [net, net], lab: id, val: 'سلكة معزولة', color: nets[net].c,
    tip: 'سلكة معزولة فوق البورد من ' + tag(a) + ' لـ ' + tag(b) + ': بتوصّل الخطين دول ببعض.' })

const parts: PerfPart[] = [
  pad('PVB', POWER, [0, 0], 'VB', 'BAT', 'سلك البطارية', 'السلك الأحمر من رجل 16 في فيشة OBD (بعد فيوز 1A)'),
  pad('PMIP', POWER, [0, 3], 'VK', 'IN+', 'لموديول LM2596', 'لـ IN+ في موديول LM2596'),
  pad('PGND', POWER, [0, 6], 'GND', 'GND', 'سلك الأرضي', 'السلك الأسود من رجل 4 و5 في فيشة OBD'),
  pad('PMIN', POWER, [22, 6], 'GND', 'IN−', 'لموديول LM2596', 'لـ IN− في موديول LM2596'),
  part('D1', 'diode', POWER, [[2, 0], [2, 3]], ['VB', 'VK'], '1N5408', 'واقف بالطول، والشريطة لتحت (على خط VK).'),
  part('D2', 'tvs', POWER, [[4, 6], [4, 3]], ['GND', 'VK'], 'P6KE18A', 'الشريطة لفوق (على خط VK).'),
  part('C1', 'can', POWER, [[8, 3], [8, 6]], ['VK', 'GND'], '100µF', 'افرد رجليه: الطويلة (+) فوق على VK.'),
  part('C2', 'ceramic', POWER, [[9, 3], [9, 6]], ['VK', 'GND'], '100nF', 'افرد رجليه. ملوش اتجاه.'),

  part('R1', 'res', KLINE_TX, [[12, 3], [12, 8]], ['VK', 'K'], '470Ω 1W', 'مرفوعة 3 مم لأنها بتسخن شوية. بتشد خط K لفوق.', { ohm: 470 }),
  part('D3', 'tvs', KLINE_TX, [[3, 6], [3, 8]], ['GND', 'K'], 'P6KE18A', 'الشريطة لتحت (على خط K).'),
  part('Q1', 'to92', KLINE_TX, [[6, 6], [6, 7], [6, 8]], ['GND', 'TXB', 'K'], '2N2222A', 'E فوق وC تحت، والوش المسطح يمين.', { face: 'right' }),
  part('R3', 'resUp', KLINE_TX, [[5, 7], [5, 6]], ['TXB', 'GND'], '10kΩ', 'بتقفل Q1 لو الـ ESP32 مش شغال.', { ohm: 10e3 }),
  part('R2', 'res', KLINE_TX, [[11, 7], [11, 12]], ['TXB', 'TX'], '2.2kΩ', 'من خط قاعدة Q1 لخط الإرسال.', { ohm: 2.2e3 }),
  pad('PK', KLINE_TX, [0, 8], 'K', 'K', 'لرجل 7 في OBD', 'السلك الأصفر رايح لرجل 7 في فيشة OBD (خط K)'),

  { id: 'U2', k: 'dip', s: KLINE_RX, legs: U2_LEGS, nets: ['RX', 'KDIV', 'REF', 'GND', 'GND', 'GND', 'nOUTB', 'V5'], lab: 'U2', val: 'سوكيت 8 رجول', chip: 'LM393',
    tip: 'السوكيت واقف بالطول: العلامة لفوق، ورجل 1 في ' + tag(U2_LEGS[0]) + ' ورجل 8 في ' + tag(U2_LEGS[7]) + '. الخطوط اللي تحته مقطوعة بين العمودين.' },
  part('R4', 'res', KLINE_RX, [[1, 8], [1, 10]], ['K', 'KDIV'], '47kΩ', 'من خط K لرجل 2.', { ohm: 47e3 }),
  part('R5', 'res', KLINE_RX, [[2, 10], [2, 12]], ['KDIV', 'GND'], '10kΩ', 'مع R4 بتنزّل خط K لحوالي 2V.', { ohm: 10e3 }),
  part('R6', 'res', KLINE_RX, [[1, 14], [1, 11]], ['VK', 'REF'], '100kΩ', 'من VK (الصف 15) للعتبة (الصف 12).', { ohm: 100e3 }),
  part('R7', 'resUp', KLINE_RX, [[3, 11], [3, 12]], ['REF', 'GND'], '10kΩ', 'مع R6 بتعمل العتبة.', { ohm: 10e3 }),
  part('R8', 'res', KLINE_RX, [[4, 9], [4, 11]], ['RX', 'REF'], '470kΩ', 'رجعة صغيرة للعتبة.', { ohm: 470e3 }),
  part('C3', 'ceramic', KLINE_RX, [[10, 9], [10, 11]], ['V5', 'GND'], '100nF', 'جنب رجل 8 في الـ LM393.'),
  link('LRX', KLINE_RX, [0, 9], [0, 13], 'RX'),
  link('LG1', KLINE_RX, [9, 11], [9, 12], 'GND'),
  link('LG2', KLINE_RX, [21, 6], [21, 11], 'GND'),
  link('LG3', KLINE_RX, [15, 11], [15, 17], 'GND'),
  link('LVK', KLINE_RX, [20, 3], [20, 14], 'VK'),

  part('R10', 'res', SENSE, [[17, 3], [17, 7]], ['VK', 'VBS'], '100kΩ', 'من VK لخط القياس.', { ohm: 100e3 }),
  part('R11', 'resUp', SENSE, [[18, 7], [18, 6]], ['VBS', 'GND'], '12kΩ', 'مع R10 بتقسم الجهد على 9.3.', { ohm: 12e3 }),
  part('C4', 'ceramic', SENSE, [[19, 7], [19, 6]], ['VBS', 'GND'], '100nF', 'ملوش اتجاه.'),

  pad('PMOP', LEADS, [0, 18], 'V5', 'OUT+', 'من LM2596', 'من OUT+ في موديول LM2596 (مظبوط 5.00V)'),
  pad('PBG', LEADS, [0, 17], 'GND', 'GND', 'الزراير والشاشة', 'الرجل التانية في التلات زراير + GND الشاشة'),
  pad('PBPG', LEADS, [22, 9], 'BPG', 'PAGE', 'زرار صفحة', 'لرجل من زرار الصفحة'),
  pad('PBSN', LEADS, [22, 10], 'BSN', 'SENS', 'زرار حساسات', 'لرجل من زرار الحساسات'),
  pad('PBFT', LEADS, [22, 11], 'BFT', 'FLT', 'زرار أعطال', 'لرجل من زرار الأعطال'),
  pad('PSCL', LEADS, [22, 14], 'SCL', 'SCL', 'للشاشة', 'لرجل SCL في الشاشة'),
  pad('PSDA', LEADS, [22, 16], 'SDA', 'SDA', 'للشاشة', 'لرجل SDA في الشاشة'),
  pad('PV33', LEADS, [33, 19], 'V33', '3V3', 'VCC الشاشة', 'لرجل VCC في الشاشة'),

  { id: 'U1', k: 'dip', s: SOCKET, legs: Array.from({ length: 30 }, (_, i) => espPin(i + 1)), nets: ESP_NETS, lab: 'U1', val: 'هيدر أنثى 2 × 15', chip: 'ESP32',
    tip: 'هيدرين 15 رجل بالطول، بينهم 10 خرمات: من ' + tag(espPin(1)) + ' لـ ' + tag(espPin(15)) + '، ومن ' + tag(espPin(30)) + ' لـ ' + tag(espPin(16)) + '. الهوائي لفوق. كل خط تحت الـ ESP32 مخروم في العمود AC ما عدا خط الأرضي (الصف 18).' },
  part('C5', 'ceramic', SOCKET, [[22, 18], [22, 17]], ['V5', 'GND'], '100nF', 'جنب VIN في الـ ESP32.'),
  link('LV5', SOCKET, [19, 9], [19, 18], 'V5'),
  link('L33', SOCKET, [31, 18], [31, 19], 'V33')
]

const cut = (strip: number, at: number): StripCut => ({ strip, at })

export const veroCuts: StripCut[] = [
  ...ESP_ROWS.filter(r => r !== ESP_GND_ROW).map(r => cut(r, BETWEEN_HEADERS)),
  cut(0, 3.5),
  ...[4, 5, 6, 8, 15].map(r => cut(r, 22.5)),
  ...[9, 10, 11, 14, 16].map(r => cut(r, 21.5)),
  cut(7, 15.5),
  cut(9, 6.5), cut(10, 6.5), cut(11, 6.5), cut(10, 8.5),
  cut(12, 9.5),
  cut(19, 28.5)
]

export const veroLayout: PerfLayout = {
  cols: 34,
  rows: 26,
  strips: { axis: 'rows', cuts: veroCuts },
  parts,
  traces: [],
  nets
}

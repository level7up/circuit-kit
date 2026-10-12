import type { Hole, NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const POWER = 2
export const SOCKET = 3
export const INPUTS = 4
export const FEEDBACK = 5
export const OUTPUT = 6
export const PANEL = 7

export const NANO_PINS = 30
const NANO_LEFT = 6
const NANO_TOP = 5
const NANO_BOTTOM = 11

export const NANO_NETS = [
  'nD1', 'nD0', 'nRST1', 'GND', 'BTN', 'nD3', 'nD4', 'nD5', 'nD6', 'RUN', 'FLT', 'PWM', 'nD10', 'nD11', 'nD12',
  'nD13', 'n3V3', 'nREF', 'SNS', 'KNB', 'ARM', 'FB', 'SDA', 'SCL', 'nA6', 'nA7', 'V5', 'nRST2', 'GND', 'VP'
]

const dipLegs = (x0: number, bottom: number, top: number, count: number): Hole[] =>
  Array.from({ length: count }, (_, i): Hole => (i < count / 2 ? [x0 + i, bottom] : [x0 + count - 1 - i, top]))

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const col = (x: number): string => (x < LETTERS.length ? LETTERS[x] : 'A' + LETTERS[x - LETTERS.length])
export const tag = ([x, y]: Hole): string => '⟦' + col(x) + (y + 1) + '⟧'

export const nets: Record<string, NetDef> = {
  IN: { n: '+12V من الأدابتر (بعد الفيوز)', c: '#e5484d' },
  VP: { n: '+12V بعد الحماية (VIN وS1)', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  V5: { n: '+5V من الأردوينو للوحة', c: '#ff9f43' },
  SDA: { n: 'SDA للشاشة', c: '#34d399' },
  SCL: { n: 'SCL للشاشة', c: '#10b981' },
  PRAW: { n: 'إشارة الحساس (قبل R1)', c: '#93c5fd' },
  SNS: { n: 'الحساس بعد الفلتر ← A0', c: '#5aa9ff' },
  KNB: { n: 'المقبض ← A1', c: '#c084fc' },
  LP: { n: '+ اللمبة بعد S1', c: '#fb923c' },
  ARM: { n: 'إحساس S1 ← A2', c: '#fbbf24' },
  DRN: { n: '− اللمبة (Drain)', c: '#f87171' },
  FB: { n: 'إحساس الخرج ← A3', c: '#fca5a5' },
  PWM: { n: 'أمر الخرج من D9', c: '#f472b6' },
  GATE: { n: 'بوابة الموسفت', c: '#e879f9' },
  BTN: { n: 'زرار التشغيل/Reset ← D2', c: '#a3e635' },
  RUN: { n: 'D7 ← لمبة التشغيل', c: '#4ade80' },
  LEDG: { n: 'لمبة التشغيل الخضرا', c: '#22c55e' },
  FLT: { n: 'D8 ← لمبة العطل', c: '#ef4444' },
  LEDR: { n: 'لمبة العطل الحمرا', c: '#dc2626' }
}

const NANO_LEGS = dipLegs(NANO_LEFT, NANO_BOTTOM, NANO_TOP, NANO_PINS)
const pin = (n: number): Hole => NANO_LEGS[n - 1]

const pad = (id: string, s: number, at: Hole, net: string, lab: string, val: string, tip: string, face?: PerfPart['face']): PerfPart =>
  ({ id, k: 'pad', s, legs: [at], nets: [net], lab, val, color: nets[net].c, tip, ...(face ? { face } : {}) })

const parts: PerfPart[] = [
  pad('PIN', POWER, [0, 0], 'IN', 'IN', 'سلك أحمر', 'الأحمر الجاي من الأدابتر 12V بعد فيوز 2A، في ' + tag([0, 0]) + '.'),
  pad('PS1', POWER, [0, 1], 'VP', 'S1', 'لـ S1', 'سلك 1 مم رايح للرجل الأولى في سويتش التشغيل S1، في ' + tag([0, 1]) + '. من هنا بتاخد اللمبة كهربتها.'),
  pad('PGIN', POWER, [0, 4], 'GND', 'GND', 'سلك أسود', 'الأسود (−) بتاع الأدابتر، في ' + tag([0, 4]) + '. سلك 1 مم لأن تيار اللمبة راجع منه.'),
  { id: 'D1', k: 'diode', s: POWER, legs: [[1, 0], [4, 0]], nets: ['IN', 'VP'], lab: 'D1', val: '1N5408', labelAt: [0, 1],
    tip: 'نايم من ' + tag([1, 0]) + ' لـ ' + tag([4, 0]) + '. الشريطة ناحية اليمين (' + tag([4, 0]) + '). رجوله تخينة: وسّع الخرمين. بيمنع الكهربا لو سلكين الأدابتر اتعكسوا.' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[1, 4], [1, 1]], nets: ['GND', 'VP'], lab: 'D2', val: 'P6KE18A', labelAt: [0.9, 1.1],
    tip: 'واقف بالطول من ' + tag([1, 4]) + ' لـ ' + tag([1, 1]) + '. الشريطة لفوق (' + tag([1, 1]) + '). بيشرب أي نبضة عالية على الـ 12V.' },
  { id: 'C1', k: 'can', s: POWER, legs: [[3, 1], [3, 3]], nets: ['VP', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) في ' + tag([3, 1]) + '، والشريطة (−) في ' + tag([3, 3]) + '.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[5, 1], [5, 2]], nets: ['VP', 'GND'], lab: 'C2', val: '100nF', labelAt: [0.8, 0],
    tip: 'بين ' + tag([5, 1]) + ' و' + tag([5, 2]) + '. ملوش اتجاه.' },

  { id: 'U1', k: 'dip', s: SOCKET, legs: NANO_LEGS, nets: NANO_NETS, lab: 'U1', val: 'هيدر أنثى 2 × 15', chip: 'Arduino Nano',
    tip: 'شريطين هيدر أنثى 15 رجل، بينهم 6 خرمات: الصف اللي فوق من ' + tag(pin(30)) + ' لـ ' + tag(pin(16)) + '، واللي تحت من ' + tag(pin(1)) + ' لـ ' + tag(pin(15)) + '. الأردوينو بيتركّب فيهم و<b>الـ USB ناحية اليمين</b>: كده VIN في ' + tag(pin(30)) + '.' },

  { id: 'R1', k: 'resUp', s: INPUTS, legs: [[22, 5], [21, 5]], nets: ['PRAW', 'SNS'], lab: 'R1', val: '1kΩ', ohm: 1e3, labelAt: [0.5, 0.9],
    tip: 'واقفة بين ' + tag([22, 5]) + ' و' + tag([21, 5]) + '. بتحمي رجل الأردوينو لو سلك الحساس لمس حاجة.' },
  { id: 'R2', k: 'resUp', s: INPUTS, legs: [[21, 2], [21, 1]], nets: ['SNS', 'GND'], lab: 'R2', val: '100kΩ', ohm: 100e3, labelAt: [-0.9, -0.4],
    tip: 'واقفة بين ' + tag([21, 2]) + ' و' + tag([21, 1]) + '. لو سلك الحساس اتقطع بتشد الدخل لـ 0V، والكود يفهم إنه عطل بدل ما يقرا رقم عشوائي.' },
  { id: 'C3', k: 'ceramic', s: INPUTS, legs: [[21, 3], [20, 3]], nets: ['SNS', 'GND'], lab: 'C3', val: '100nF', labelAt: [-0.5, 0.9],
    tip: 'بين ' + tag([21, 3]) + ' و' + tag([20, 3]) + '. مع R1 بيعملوا فلتر للشوشرة.' },
  { id: 'R3', k: 'resUp', s: INPUTS, legs: [[23, 4], [24, 4]], nets: ['KNB', 'GND'], lab: 'R3', val: '100kΩ', ohm: 100e3, labelAt: [0.5, 0.9],
    tip: 'واقفة بين ' + tag([23, 4]) + ' و' + tag([24, 4]) + '. لو سلك المقبض اتقطع، الطلب يبقى صفر مش عشوائي.' },
  pad('PSNS', INPUTS, [22, 2], 'PRAW', 'SIG', 'إشارة الحساس', 'السلك الأوسط (الإشارة) من بوتنشيومتر محاكي الحساس، في ' + tag([22, 2]) + '.', 'up'),
  pad('PKNB', INPUTS, [23, 2], 'KNB', 'KNOB', 'إشارة المقبض', 'السلك الأوسط من بوتنشيومتر المقبض، في ' + tag([23, 2]) + '.', 'up'),

  { id: 'R4', k: 'resUp', s: FEEDBACK, legs: [[26, 5], [25, 5]], nets: ['LP', 'ARM'], lab: 'R4', val: '47kΩ', ohm: 47e3, labelAt: [0.5, 0.9],
    tip: 'واقفة بين ' + tag([26, 5]) + ' و' + tag([25, 5]) + '. مع R5 بتنزّل الـ 12V بتاعة S1 لحوالي 2V يقدر الأردوينو يقراها.' },
  { id: 'R5', k: 'resUp', s: FEEDBACK, legs: [[25, 2], [25, 1]], nets: ['ARM', 'GND'], lab: 'R5', val: '10kΩ', ohm: 10e3, labelAt: [-0.9, -0.4],
    tip: 'واقفة بين ' + tag([25, 2]) + ' و' + tag([25, 1]) + '.' },
  { id: 'R6', k: 'resUp', s: FEEDBACK, legs: [[28, 5], [27, 5]], nets: ['DRN', 'FB'], lab: 'R6', val: '47kΩ', ohm: 47e3, labelAt: [0.5, 0.9],
    tip: 'واقفة بين ' + tag([28, 5]) + ' و' + tag([27, 5]) + '. مع R7 بيخلّوا الأردوينو يشوف رجل الـ Drain: الموسفت مقفول لازم يبقى عليها 12V.' },
  { id: 'R7', k: 'resUp', s: FEEDBACK, legs: [[27, 2], [27, 1]], nets: ['FB', 'GND'], lab: 'R7', val: '10kΩ', ohm: 10e3, labelAt: [0.9, -0.4],
    tip: 'واقفة بين ' + tag([27, 2]) + ' و' + tag([27, 1]) + '.' },
  pad('PLP', FEEDBACK, [26, 2], 'LP', 'LAMP+', 'من S1', 'سلك من الرجل التانية في S1 (اللي رايحة لـ + اللمبة)، في ' + tag([26, 2]) + '. ده سلك إحساس بس: تيار اللمبة مش بيعدّي في البورد.', 'up'),

  { id: 'R10', k: 'res', s: OUTPUT, legs: [[20, 15], [23, 15]], nets: ['PWM', 'GATE'], lab: 'R10', val: '220Ω', ohm: 220,
    tip: 'نايمة من ' + tag([20, 15]) + ' لـ ' + tag([23, 15]) + '. ملهاش اتجاه. بتحمي رجل D9 من تيار شحن البوابة.' },
  { id: 'Q1', k: 'to220', s: OUTPUT, legs: [[24, 15], [25, 15], [26, 15]], nets: ['GATE', 'DRN', 'GND'], lab: 'Q1', val: 'IRLZ44N', face: 'up', labelAt: [0, -1.3],
    tip: 'رجوله بالعرض: <b>G</b> في ' + tag([24, 15]) + '، و<b>D</b> في ' + tag([25, 15]) + '، و<b>S</b> في ' + tag([26, 15]) + '. الكتابة ناحيتك لتحت والضهر المعدن لفوق.' },
  { id: 'R11', k: 'resUp', s: OUTPUT, legs: [[24, 16], [24, 17]], nets: ['GATE', 'GND'], lab: 'R11', val: '100kΩ', ohm: 100e3, labelAt: [-1, 0],
    tip: 'واقفة بين ' + tag([24, 16]) + ' و' + tag([24, 17]) + '. أهم مقاومة في البورد: لو الأردوينو مفصول أو بيعمل Reset، بتشد البوابة للأرضي فاللمبة تطفي.' },
  pad('PDRN', OUTPUT, [28, 15], 'DRN', 'LAMP−', 'لـ − اللمبة', 'السلك رايح لـ − اللمبة، في ' + tag([28, 15]) + '. سلك 1 مم.', 'down'),

  pad('PGND', PANEL, [7, 0], 'GND', 'GND', 'أرضي اللوحة', 'سلك أسود للوحة: البوتنشيومترين والشاشة واللمبتين والزرار، في ' + tag([7, 0]) + '.'),
  pad('P5V', PANEL, [9, 0], 'V5', '5V', '5V للوحة', 'سلك أحمر رفيع للوحة: البوتنشيومترين والشاشة، في ' + tag([9, 0]) + '.'),
  pad('PSCL', PANEL, [12, 0], 'SCL', 'SCL', 'للشاشة', 'لرجل SCL في الشاشة، في ' + tag([12, 0]) + '.'),
  pad('PSDA', PANEL, [13, 0], 'SDA', 'SDA', 'للشاشة', 'لرجل SDA في الشاشة، في ' + tag([13, 0]) + '.'),
  pad('PBTN', PANEL, [10, 12], 'BTN', 'BTN', 'للزرار', 'لرجل من الزرار، والرجل التانية على أرضي اللوحة، في ' + tag([10, 12]) + '.', 'down'),
  { id: 'R8', k: 'resUp', s: PANEL, legs: [[15, 12], [15, 13]], nets: ['RUN', 'LEDG'], lab: 'R8', val: '1kΩ', ohm: 1e3, labelAt: [-1, 0],
    tip: 'واقفة بين ' + tag([15, 12]) + ' و' + tag([15, 13]) + '. بتحدد تيار اللمبة الخضرا.' },
  { id: 'R9', k: 'resUp', s: PANEL, legs: [[16, 12], [16, 13]], nets: ['FLT', 'LEDR'], lab: 'R9', val: '1kΩ', ohm: 1e3, labelAt: [1, 0],
    tip: 'واقفة بين ' + tag([16, 12]) + ' و' + tag([16, 13]) + '. بتحدد تيار اللمبة الحمرا.' },
  pad('PRUN', PANEL, [15, 14], 'LEDG', 'RUN', 'للخضرا', 'للرجل الطويلة في اللمبة الخضرا (شغال)، في ' + tag([15, 14]) + '.', 'down'),
  pad('PFLT', PANEL, [16, 14], 'LEDR', 'FLT', 'للحمرا', 'للرجل الطويلة في اللمبة الحمرا (عطل)، في ' + tag([16, 14]) + '.', 'down')
]

const t = (net: string, s: number, ...pts: Hole[]): PerfTrace => ({ net, s, pts })

const traces: PerfTrace[] = [
  t('IN', POWER, [0, 0], [1, 0]),
  t('VP', POWER, [4, 0], [6, 0]),
  t('VP', POWER, [4, 0], [4, 1], [0, 1]),
  t('VP', POWER, [5, 0], [5, 1]),
  t('GND', POWER, [0, 4], [5, 4]),
  t('GND', POWER, [5, 2], [5, 4]),
  t('GND', POWER, [3, 3], [3, 4]),
  t('GND', POWER, [0, 4], [0, 17], [29, 17]),

  t('VP', SOCKET, [6, 0], pin(30)),
  t('GND', SOCKET, [7, 0], [7, 10], [9, 10], [9, 17]),
  t('V5', SOCKET, [9, 0], pin(27)),
  t('SCL', SOCKET, [12, 0], pin(24)),
  t('SDA', SOCKET, [13, 0], pin(23)),

  t('SNS', INPUTS, pin(19), [17, 6], [21, 6], [21, 2]),
  t('KNB', INPUTS, pin(20), [16, 7], [23, 7], [23, 2]),
  t('PRAW', INPUTS, [22, 2], [22, 5]),
  t('GND', INPUTS, [29, 17], [29, 1], [20, 1]),
  t('GND', INPUTS, [20, 1], [20, 3]),
  t('GND', INPUTS, [24, 1], [24, 4]),

  t('ARM', FEEDBACK, pin(21), [15, 8], [25, 8], [25, 2]),
  t('FB', FEEDBACK, pin(22), [14, 9], [27, 9], [27, 2]),
  t('LP', FEEDBACK, [26, 2], [26, 5]),

  t('DRN', OUTPUT, [28, 5], [28, 15]),
  t('DRN', OUTPUT, [28, 14], [25, 14], [25, 15]),
  t('PWM', OUTPUT, pin(12), [17, 15], [20, 15]),
  t('GATE', OUTPUT, [23, 15], [24, 15], [24, 16]),
  t('GND', OUTPUT, [26, 15], [26, 17]),

  t('BTN', PANEL, pin(5), [10, 12]),
  t('RUN', PANEL, pin(10), [15, 12]),
  t('LEDG', PANEL, [15, 13], [15, 14]),
  t('FLT', PANEL, pin(11), [16, 12]),
  t('LEDR', PANEL, [16, 13], [16, 14])
]

export const SCHEMATIC: Record<string, string[]> = {
  U1: NANO_NETS,
  D1: ['IN', 'VP'],
  D2: ['GND', 'VP'],
  C1: ['VP', 'GND'],
  C2: ['VP', 'GND'],
  R1: ['PRAW', 'SNS'],
  R2: ['SNS', 'GND'],
  C3: ['SNS', 'GND'],
  R3: ['KNB', 'GND'],
  R4: ['LP', 'ARM'],
  R5: ['ARM', 'GND'],
  R6: ['DRN', 'FB'],
  R7: ['FB', 'GND'],
  R8: ['RUN', 'LEDG'],
  R9: ['FLT', 'LEDR'],
  R10: ['PWM', 'GATE'],
  R11: ['GATE', 'GND'],
  Q1: ['GATE', 'DRN', 'GND']
}

export const ARDUINO_PINS: Record<string, number> = {
  D2: 5, D7: 10, D8: 11, D9: 12, A0: 19, A1: 20, A2: 21, A3: 22, A4: 23, A5: 24, '5V': 27, GND: 29, VIN: 30
}

export const benchLayout: PerfLayout = {
  cols: 30,
  rows: 18,
  parts,
  traces,
  nets
}

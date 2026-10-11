import type { Hole, NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const SOCKETS = 2
export const POWER = 3
export const CLOCK = 4
export const COUNTER = 5
export const DIODES = 6
export const DRIVE = 7
export const LEADS = 8

const U2_NETS = ['CI', 'CK', 'GND', 'nc4', 'GND', 'nc6', 'GND', 'nc8', 'V9', 'nc10', 'V9', 'nc12', 'V9', 'V9']
const U3_NETS = ['Q5', 'nq1', 'Q0', 'Q2', 'nq6', 'Q7', 'nq3', 'GND', 'nq8', 'nq4', 'nq9', 'nco', 'GND', 'CK', 'RST', 'V9']

const dipLegs = (x0: number, bottom: number, top: number, count: number): Hole[] =>
  Array.from({ length: count }, (_, i): Hole => (i < count / 2 ? [x0 + i, bottom] : [x0 + count - 1 - i, top]))

export const nets: Record<string, NetDef> = {
  IN: { n: 'دخل +12V (بعد الفيوز والسويتش)', c: '#e5484d' },
  V12: { n: '+12V بعد الحماية', c: '#ffb547' },
  V9: { n: '+9V للشرايح', c: '#ff9f43' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  CI: { n: 'دخل الساعة (المكثف)', c: '#7dd3fc' },
  CK: { n: 'نبضات الساعة', c: '#5aa9ff' },
  RST: { n: 'Reset أول ما الكهربا تيجي', c: '#f9a8d4' },
  Q0: { n: 'خرج Q0 (الخطوة 0)', c: '#a78bfa' },
  Q2: { n: 'خرج Q2 (الخطوة 2)', c: '#fbbf24' },
  Q5: { n: 'خرج Q5 (الخطوة 5)', c: '#fb923c' },
  Q7: { n: 'خرج Q7 (الخطوة 7)', c: '#e879f9' },
  SL: { n: 'خط الشمال: الخطوة 0 و2', c: '#93c5fd' },
  SR: { n: 'خط اليمين: الخطوة 5 و7', c: '#fca5a5' },
  GL: { n: 'بوابة موسفت الشمال (G)', c: '#60a5fa' },
  GR: { n: 'بوابة موسفت اليمين (G)', c: '#f87171' },
  OL: { n: '− لمبة الشمال (D)', c: '#2563eb' },
  OR: { n: '− لمبة اليمين (D)', c: '#dc2626' }
}

export interface FlashDiode {
  id: string
  q: number
  x: number
  line: 'SL' | 'SR'
}

export const LINE_ROW = { SL: 12, SR: 13 }
const ANODE_ROW = 9

export const FLASH_DIODES: FlashDiode[] = [
  { id: 'D5', q: 5, x: 12, line: 'SR' },
  { id: 'D3', q: 0, x: 14, line: 'SL' },
  { id: 'D4', q: 2, x: 15, line: 'SL' },
  { id: 'D6', q: 7, x: 17, line: 'SR' }
]

const col = (x: number): string => String.fromCharCode(65 + x)
const tag = ([x, y]: Hole): string => '⟦' + col(x) + (y + 1) + '⟧'
const SIDE = { SL: 'الشمال', SR: 'اليمين' }

const diodePart = (d: FlashDiode): PerfPart => {
  const anode: Hole = [d.x, ANODE_ROW]
  const cathode: Hole = [d.x, LINE_ROW[d.line]]
  return {
    id: d.id, k: 'diode', s: DIODES, legs: [anode, cathode], nets: ['Q' + d.q, d.line], lab: d.id, val: '1N4148', labelAt: [d.id === 'D3' ? -0.8 : 0.8, 0],
    tip: 'واقف بالطول من ' + tag(anode) + ' (تحت رجل Q' + d.q + ' على طول) لـ ' + tag(cathode) + '. <b>الشريطة تحت</b> على خط ' + SIDE[d.line] + '.'
  }
}

const parts: PerfPart[] = [
  { id: 'U2', k: 'dip', s: SOCKETS, legs: dipLegs(1, 8, 5, 14), nets: U2_NETS, lab: 'U2', val: 'قاعدة 14 رجل', chip: 'CD40106',
    tip: 'قاعدة 14 رجل: الحز ناحية الشمال، رجل 1 في ⟦B9⟧ ورجل 14 في ⟦B6⟧. هنا هيدخل الـ CD40106 (الساعة).' },
  { id: 'U3', k: 'dip', s: SOCKETS, legs: dipLegs(12, 8, 5, 16), nets: U3_NETS, lab: 'U3', val: 'قاعدة 16 رجل', chip: 'CD4017',
    tip: 'قاعدة 16 رجل: الحز ناحية الشمال، رجل 1 في ⟦M9⟧ ورجل 16 في ⟦M6⟧. هنا هيدخل الـ CD4017 (العدّاد).' },

  { id: 'RED', k: 'pad', s: POWER, legs: [[0, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من السويتش والفيوز 1A، في ⟦A1⟧.' },
  { id: 'BLACK', k: 'pad', s: POWER, legs: [[0, 3]], nets: ['GND'], lab: 'GND', val: 'سلك أسود تخين', color: '#3a3a3a',
    tip: 'الأرضي، في ⟦A4⟧. سلك <b>1.5 مم</b> لأن تيار اللمبتين راجع منه.' },
  { id: 'D1', k: 'diode', s: POWER, legs: [[1, 0], [4, 0]], nets: ['IN', 'V12'], lab: 'D1', val: '1N4007',
    tip: 'نايم بالعرض من ⟦B1⟧ لـ ⟦E1⟧. الشريطة ناحية اليمين (⟦E1⟧). بيمنع الكهربا لو السلكين اتعكسوا.' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[5, 3], [5, 0]], nets: ['GND', 'V12'], lab: 'D2', val: 'P6KE18A', labelAt: [-1.1, 0],
    tip: 'واقف بالطول من ⟦F4⟧ لـ ⟦F1⟧. الشريطة لفوق (⟦F1⟧). بيشرب النبضات العالية.' },
  { id: 'C1', k: 'can', s: POWER, legs: [[6, 0], [6, 2]], nets: ['V12', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) فوق في ⟦G1⟧، والشريطة (−) في ⟦G3⟧.' },
  { id: 'U1', k: 'to220', s: POWER, legs: [[8, 1], [9, 1], [10, 1]], nets: ['V12', 'GND', 'V9'], lab: 'U1', val: '7809', face: 'down', labelAt: [0, 1.5],
    tip: 'رجوله بالعرض: IN في ⟦I2⟧، وGND في ⟦J2⟧، وOUT في ⟦K2⟧. الكتابة ناحيتك (لتحت) والضهر المعدن لفوق.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[11, 1], [11, 2]], nets: ['V9', 'GND'], lab: 'C2', val: '100nF', labelAt: [0.8, 0],
    tip: 'بين ⟦L2⟧ و⟦L3⟧، جنب خرج الـ 7809. ملوش اتجاه.' },
  { id: 'W1', k: 'wire', s: POWER, legs: [[10, 2], [10, 4]], nets: ['V9', 'V9'], lab: '', val: 'سلكة', color: '#ff9f43',
    tip: 'سلكة من فوق (ناحية المكونات) من ⟦K3⟧ لـ ⟦K5⟧: بتعدّي الـ 9V فوق خط الأرضي.' },
  { id: 'C3', k: 'can', s: POWER, legs: [[7, 4], [7, 3]], nets: ['V9', 'GND'], lab: 'C3', val: '100µF', labelAt: [0, -1.2],
    tip: 'الرجل الطويلة (+) تحت في ⟦H5⟧ (خط الـ 9V)، والشريطة (−) فوق في ⟦H4⟧ (خط الأرضي).' },

  { id: 'R1', k: 'resUp', s: CLOCK, legs: [[1, 9], [2, 9]], nets: ['CI', 'CK'], lab: 'R1', val: '100kΩ', ohm: 100e3, labelAt: [0.5, 1.2],
    tip: 'واقفة بين ⟦B10⟧ و⟦C10⟧، تحت رجل 1 و2 بتوع U2 على طول. هي اللي بتحدد السرعة: أكبر = أبطأ.' },
  { id: 'C4', k: 'can', s: CLOCK, legs: [[1, 10], [1, 12]], nets: ['CI', 'GND'], lab: 'C4', val: '1µF',
    tip: 'الرجل الطويلة (+) في ⟦B11⟧، والشريطة (−) في ⟦B13⟧.' },

  { id: 'C5', k: 'ceramic', s: COUNTER, legs: [[12, 4], [13, 4]], nets: ['V9', 'RST'], lab: 'C5', val: '100nF', labelAt: [0, -0.7],
    tip: 'نايم بين ⟦M5⟧ و⟦N5⟧، فوق رجل 16 و15 بتوع U3. ملوش اتجاه. أول ما الكهربا تيجي بيدّي نبضة Reset فالعدّاد يبدأ من الخطوة 0.' },
  { id: 'R3', k: 'resUp', s: COUNTER, legs: [[14, 4], [14, 3]], nets: ['RST', 'GND'], lab: 'R3', val: '100kΩ', ohm: 100e3, labelAt: [0.9, -0.4],
    tip: 'واقفة بين ⟦O5⟧ و⟦O4⟧. بتفضّي C5 بعد النبضة فالعدّاد يشتغل.' },

  ...FLASH_DIODES.map(diodePart),

  { id: 'R4', k: 'res', s: DRIVE, legs: [[19, 12], [22, 12]], nets: ['SL', 'GL'], lab: 'R4', val: '1kΩ', ohm: 1e3,
    tip: 'نايمة بالعرض من ⟦T13⟧ لـ ⟦W13⟧. ملهاش اتجاه. بتحمي رجل البوابة.' },
  { id: 'R6', k: 'resUp', s: DRIVE, legs: [[21, 11], [20, 11]], nets: ['GL', 'GND'], lab: 'R6', val: '100kΩ', ohm: 100e3, labelAt: [-1.4, 0.2],
    tip: 'واقفة بين ⟦V12⟧ و⟦U12⟧، تحت Q1 على طول. بتشد البوابة للأرضي: لو الكهربا فصلت الكشاف يطفي.' },
  { id: 'Q1', k: 'to220', s: DRIVE, legs: [[20, 10], [21, 10], [22, 10]], nets: ['GND', 'OL', 'GL'], lab: 'Q1', val: 'IRLZ44N', face: 'up', labelAt: [0, -1.2],
    tip: 'الشمال. رجوله بالعرض: <b>S</b> في ⟦U11⟧، و<b>D</b> في ⟦V11⟧، و<b>G</b> في ⟦W11⟧. الكتابة لتحت والضهر المعدن لفوق.' },
  { id: 'R5', k: 'res', s: DRIVE, legs: [[18, 13], [20, 13]], nets: ['SR', 'GR'], lab: 'R5', val: '1kΩ', ohm: 1e3, labelAt: [-1.4, 0.6],
    tip: 'نايمة بالعرض من ⟦S14⟧ لـ ⟦U14⟧. ملهاش اتجاه.' },
  { id: 'R7', k: 'resUp', s: DRIVE, legs: [[19, 14], [19, 15]], nets: ['GR', 'GND'], lab: 'R7', val: '100kΩ', ohm: 100e3, labelAt: [-1, 0.6],
    tip: 'واقفة بين ⟦T15⟧ و⟦T16⟧. نفس شغل R6 لليمين.' },
  { id: 'Q2', k: 'to220', s: DRIVE, legs: [[20, 15], [21, 15], [22, 15]], nets: ['GR', 'OR', 'GND'], lab: 'Q2', val: 'IRLZ44N', face: 'down', labelAt: [1.6, 1.1],
    tip: 'اليمين. رجوله بالعرض: <b>G</b> في ⟦U16⟧، و<b>D</b> في ⟦V16⟧، و<b>S</b> في ⟦W16⟧. الكتابة لفوق والضهر المعدن لتحت.' },

  { id: 'OUTL', k: 'pad', s: LEADS, legs: [[23, 9]], nets: ['OL'], lab: 'L−', val: 'لـ − كشاف الشمال', color: nets.OL.c,
    tip: 'السلك رايح لـ − كشاف الشمال، في ⟦X10⟧. الـ + بتاعه من فيوز 2A لوحده.' },
  { id: 'OUTR', k: 'pad', s: LEADS, legs: [[23, 14]], nets: ['OR'], lab: 'R−', val: 'لـ − كشاف اليمين', color: nets.OR.c,
    tip: 'السلك رايح لـ − كشاف اليمين، في ⟦X15⟧. الـ + بتاعه من فيوز 2A لوحده.' }
]

const rail = (net: string, s: number, ...pts: Hole[]): PerfTrace => ({ net, s, pts })

const traces: PerfTrace[] = [
  rail('IN', POWER, [0, 0], [1, 0]),
  rail('V12', POWER, [4, 0], [8, 0], [8, 1]),
  rail('V9', POWER, [10, 1], [11, 1]),
  rail('V9', POWER, [10, 1], [10, 2]),
  rail('GND', POWER, [9, 1], [9, 3]),
  rail('GND', POWER, [6, 2], [6, 3]),
  rail('GND', POWER, [11, 2], [11, 3]),
  rail('GND', POWER, [0, 3], [15, 3]),
  rail('V9', POWER, [1, 4], [12, 4], [12, 5]),
  rail('V9', POWER, [1, 4], [1, 5]),
  rail('V9', POWER, [2, 4], [2, 5]),
  rail('V9', POWER, [4, 4], [4, 5]),
  rail('V9', POWER, [6, 4], [6, 5]),
  rail('GND', POWER, [0, 3], [0, 16]),

  rail('GND', CLOCK, [3, 8], [3, 12], [1, 12]),
  rail('GND', CLOCK, [3, 9], [7, 9]),
  rail('GND', CLOCK, [5, 8], [5, 9]),
  rail('GND', CLOCK, [7, 8], [7, 9]),
  rail('GND', CLOCK, [1, 12], [0, 12]),
  rail('CI', CLOCK, [1, 8], [1, 10]),
  rail('CK', CLOCK, [2, 8], [2, 9]),
  rail('CK', CLOCK, [2, 8], [2, 7], [14, 7], [14, 5]),

  rail('RST', COUNTER, [13, 5], [13, 4], [14, 4]),
  rail('GND', COUNTER, [19, 8], [19, 7], [15, 7], [15, 3]),

  ...FLASH_DIODES.map(d => rail('Q' + d.q, DIODES, [d.x, ANODE_ROW - 1], [d.x, ANODE_ROW])),
  rail('SL', DIODES, [14, LINE_ROW.SL], [19, LINE_ROW.SL]),
  rail('SR', DIODES, [12, LINE_ROW.SR], [18, LINE_ROW.SR]),

  rail('GND', DRIVE, [15, 3], [20, 3], [20, 11]),
  rail('GND', DRIVE, [0, 16], [22, 16], [22, 15]),
  rail('GND', DRIVE, [19, 15], [19, 16]),
  rail('GL', DRIVE, [22, 12], [22, 10]),
  rail('GL', DRIVE, [22, 11], [21, 11]),
  rail('GR', DRIVE, [20, 13], [20, 15]),
  rail('GR', DRIVE, [20, 14], [19, 14]),

  rail('OL', LEADS, [21, 10], [21, 9], [23, 9]),
  rail('OR', LEADS, [21, 15], [21, 14], [23, 14])
]

export const SCHEMATIC: Record<string, string[]> = {
  U1: ['V12', 'GND', 'V9'],
  U2: U2_NETS,
  U3: U3_NETS,
  D1: ['IN', 'V12'],
  D2: ['GND', 'V12'],
  C1: ['V12', 'GND'],
  C2: ['V9', 'GND'],
  C3: ['V9', 'GND'],
  R1: ['CI', 'CK'],
  C4: ['CI', 'GND'],
  C5: ['V9', 'RST'],
  R3: ['RST', 'GND'],
  D3: ['Q0', 'SL'],
  D4: ['Q2', 'SL'],
  D5: ['Q5', 'SR'],
  D6: ['Q7', 'SR'],
  R4: ['SL', 'GL'],
  R5: ['SR', 'GR'],
  R6: ['GL', 'GND'],
  R7: ['GR', 'GND'],
  Q1: ['GND', 'OL', 'GL'],
  Q2: ['GR', 'OR', 'GND']
}

export const flashLayout: PerfLayout = {
  cols: 24,
  rows: 17,
  parts,
  traces,
  nets
}

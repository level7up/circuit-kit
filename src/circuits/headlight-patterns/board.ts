import type { Hole, NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'
import { BUS_LETTER, type BusId } from './patterns'

export const SOCKETS = 2
export const POWER = 3
export const CLOCK = 4
export const COUNTER = 5
export const MATRIX = 6
export const DRIVE = 7
export const LEADS = 8

const U2_NETS = ['CI', 'CK', 'GND', 'nc4', 'GND', 'nc6', 'GND', 'nc8', 'V9', 'nc10', 'V9', 'nc12', 'V9', 'V9']
const U3_NETS = ['Q5', 'Q1', 'Q0', 'Q2', 'Q6', 'Q7', 'Q3', 'GND', 'Q8', 'Q4', 'nq9', 'nco', 'GND', 'CK', 'RST', 'V9']

const dipLegs = (x0: number, bottom: number, top: number, count: number): Hole[] =>
  Array.from({ length: count }, (_, i): Hole => (i < count / 2 ? [x0 + i, bottom] : [x0 + count - 1 - i, top]))

const col = (x: number): string => (x < 26 ? String.fromCharCode(65 + x) : 'A' + String.fromCharCode(65 + x - 26))
const tag = ([x, y]: Hole): string => '⟦' + col(x) + (y + 1) + '⟧'

const Q_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#fb923c', '#a3e635', '#e879f9', '#60a5fa']

export const BUS_ROW: Record<BusId, number> = { BA: 16, BB: 17, BC: 18, BD: 19, BE: 20 }

export const nets: Record<string, NetDef> = {
  IN: { n: 'دخل +12V (بعد الفيوز والسويتش الرئيسي)', c: '#e5484d' },
  V12: { n: '+12V بعد الحماية', c: '#ffb547' },
  V9: { n: '+9V للشرايح', c: '#ff9f43' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  CI: { n: 'دخل الساعة (المكثف)', c: '#7dd3fc' },
  CK: { n: 'نبضات الساعة', c: '#5aa9ff' },
  RST: { n: 'Reset أول ما الكهربا تيجي', c: '#f9a8d4' },
  ...Object.fromEntries(Q_COLORS.map((c, n) => ['Q' + n, { n: 'خرج Q' + n + ' (الخطوة ' + n + ')', c }])),
  BA: { n: 'خط A: الخطوات 0–3', c: '#c084fc' },
  BB: { n: 'خط B: الخطوات 5–8', c: '#4ade80' },
  BC: { n: 'خط C: الخطوة 0 و2', c: '#facc15' },
  BD: { n: 'خط D: الخطوة 5 و7', c: '#f87171' },
  BE: { n: 'خط E: الخطوات 2–5', c: '#38bdf8' },
  SL: { n: 'من السويتش الدوّار ← الشمال', c: '#93c5fd' },
  SR: { n: 'من السويتش الدوّار ← اليمين', c: '#fca5a5' },
  GL: { n: 'بوابة موسفت الشمال (G)', c: '#60a5fa' },
  GR: { n: 'بوابة موسفت اليمين (G)', c: '#f87171' },
  OL: { n: '− لمبة الشمال (D)', c: '#2563eb' },
  OR: { n: '− لمبة اليمين (D)', c: '#dc2626' }
}

interface MatrixDiode {
  id: string
  q: number
  x: number
  y: number
  bus: BusId
}

export const MATRIX_DIODES: MatrixDiode[] = [
  { id: 'DB1', q: 5, x: 8, y: 9, bus: 'BB' },
  { id: 'DD1', q: 5, x: 9, y: 9, bus: 'BD' },
  { id: 'DE1', q: 5, x: 10, y: 9, bus: 'BE' },
  { id: 'DA1', q: 1, x: 11, y: 10, bus: 'BA' },
  { id: 'DA2', q: 0, x: 12, y: 11, bus: 'BA' },
  { id: 'DC1', q: 0, x: 13, y: 11, bus: 'BC' },
  { id: 'DA3', q: 2, x: 14, y: 12, bus: 'BA' },
  { id: 'DC2', q: 2, x: 15, y: 12, bus: 'BC' },
  { id: 'DE2', q: 2, x: 16, y: 12, bus: 'BE' },
  { id: 'DB2', q: 6, x: 17, y: 11, bus: 'BB' },
  { id: 'DB3', q: 7, x: 18, y: 10, bus: 'BB' },
  { id: 'DD2', q: 7, x: 19, y: 10, bus: 'BD' },
  { id: 'DA4', q: 3, x: 20, y: 9, bus: 'BA' },
  { id: 'DE3', q: 3, x: 21, y: 9, bus: 'BE' },
  { id: 'DE4', q: 4, x: 22, y: 9, bus: 'BE' },
  { id: 'DB4', q: 8, x: 23, y: 9, bus: 'BB' }
]

const matrixPart = (d: MatrixDiode): PerfPart => {
  const anode: Hole = [d.x, d.y]
  const cathode: Hole = [d.x, BUS_ROW[d.bus]]
  return {
    id: d.id, k: 'diode', s: MATRIX, legs: [anode, cathode], nets: ['Q' + d.q, d.bus], lab: BUS_LETTER[d.bus], val: '1N4148 · ' + d.id, labelAt: [0, -(BUS_ROW[d.bus] - d.y) / 2 - 0.5],
    tip: 'واقف بالطول من ' + tag(anode) + ' لـ ' + tag(cathode) + '. الرجل اللي فوق جاية من <b>Q' + d.q + '</b>، و<b>الشريطة تحت</b> على خط ' + BUS_LETTER[d.bus] +
      '. جسمه بيعدّي فوق الخطوط اللي في السكة عادي، المهم الرجلين بس.'
  }
}

const busPad = (bus: BusId): PerfPart => ({
  id: 'P' + BUS_LETTER[bus], k: 'pad', s: LEADS, legs: [[0, BUS_ROW[bus]]], nets: [bus], lab: BUS_LETTER[bus], val: 'للسويتش الدوّار', color: nets[bus].c,
  tip: 'سلك خط ' + BUS_LETTER[bus] + ' رايح للسويتش الدوّار، في ' + tag([0, BUS_ROW[bus]]) + '.'
})

const parts: PerfPart[] = [
  { id: 'U2', k: 'dip', s: SOCKETS, legs: dipLegs(1, 8, 5, 14), nets: U2_NETS, lab: 'U2', val: 'قاعدة 14 رجل', chip: 'CD40106',
    tip: 'قاعدة 14 رجل: الحز ناحية الشمال، رجل 1 في ⟦B9⟧ ورجل 14 في ⟦B6⟧. هنا هيدخل الـ CD40106 (الساعة).' },
  { id: 'U3', k: 'dip', s: SOCKETS, legs: dipLegs(12, 8, 5, 16), nets: U3_NETS, lab: 'U3', val: 'قاعدة 16 رجل', chip: 'CD4017',
    tip: 'قاعدة 16 رجل: الحز ناحية الشمال، رجل 1 في ⟦M9⟧ ورجل 16 في ⟦M6⟧. هنا هيدخل الـ CD4017 (العدّاد).' },

  { id: 'RED', k: 'pad', s: POWER, legs: [[0, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من السويتش الرئيسي والفيوز 1A، في ⟦A1⟧.' },
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

  ...MATRIX_DIODES.map(matrixPart),

  { id: 'R4', k: 'res', s: DRIVE, legs: [[28, 13], [28, 11]], nets: ['SL', 'GL'], lab: 'R4', val: '1kΩ', ohm: 1e3,
    tip: 'نايمة بالطول من ⟦AC14⟧ لـ ⟦AC12⟧. ملهاش اتجاه. بتحمي رجل البوابة من الشحنات.' },
  { id: 'R6', k: 'resUp', s: DRIVE, legs: [[27, 12], [26, 12]], nets: ['GL', 'GND'], lab: 'R6', val: '100kΩ', ohm: 100e3, labelAt: [-0.6, 1],
    tip: 'واقفة بين ⟦AB13⟧ و⟦AA13⟧. بتشد البوابة للأرضي: لو السويتش بين وضعين أو الكهربا فصلت، اللمبة تطفي.' },
  { id: 'Q1', k: 'to220', s: DRIVE, legs: [[25, 11], [26, 11], [27, 11]], nets: ['GND', 'OL', 'GL'], lab: 'Q1', val: 'IRLZ44N', face: 'up', labelAt: [0, -1.2],
    tip: 'الشمال. رجوله بالعرض: <b>S</b> في ⟦Z12⟧، و<b>D</b> في ⟦AA12⟧، و<b>G</b> في ⟦AB12⟧. يعني الكتابة لتحت والضهر المعدن لفوق (مقلوب عن الـ 7809).' },
  { id: 'R5', k: 'res', s: DRIVE, legs: [[28, 15], [28, 17]], nets: ['SR', 'GR'], lab: 'R5', val: '1kΩ', ohm: 1e3,
    tip: 'نايمة بالطول من ⟦AC16⟧ لـ ⟦AC18⟧. ملهاش اتجاه.' },
  { id: 'R7', k: 'resUp', s: DRIVE, legs: [[27, 16], [26, 16]], nets: ['GR', 'GND'], lab: 'R7', val: '100kΩ', ohm: 100e3, labelAt: [-0.6, -0.8],
    tip: 'واقفة بين ⟦AB17⟧ و⟦AA17⟧. نفس شغل R6 لليمين.' },
  { id: 'Q2', k: 'to220', s: DRIVE, legs: [[25, 17], [26, 17], [27, 17]], nets: ['GND', 'OR', 'GR'], lab: 'Q2', val: 'IRLZ44N', face: 'down', labelAt: [0, 1.3],
    tip: 'اليمين. رجوله بالعرض: <b>S</b> في ⟦Z18⟧، و<b>D</b> في ⟦AA18⟧، و<b>G</b> في ⟦AB18⟧. الكتابة لفوق والضهر المعدن لتحت.' },

  ...(['BA', 'BB', 'BC', 'BD', 'BE'] as BusId[]).map(busPad),
  { id: 'PSL', k: 'pad', s: LEADS, legs: [[29, 13]], nets: ['SL'], lab: 'L', val: 'من السويتش', color: nets.SL.c,
    tip: 'السلك الجاي من <b>نص السويتش الأول</b> (طرف الشمال)، في ⟦AD14⟧.' },
  { id: 'PSR', k: 'pad', s: LEADS, legs: [[29, 15]], nets: ['SR'], lab: 'R', val: 'من السويتش', color: nets.SR.c,
    tip: 'السلك الجاي من <b>نص السويتش التاني</b> (طرف اليمين)، في ⟦AD16⟧.' },
  { id: 'OUTL', k: 'pad', s: LEADS, legs: [[26, 0]], nets: ['OL'], lab: 'L−', val: 'لـ − لمبة الشمال', color: nets.OL.c, face: 'up',
    tip: 'السلك رايح لـ <b>−</b> لمبة الشمال، في ⟦AA1⟧. الـ + بتاعها من فيوز 2A لوحده.' },
  { id: 'OUTR', k: 'pad', s: LEADS, legs: [[26, 20]], nets: ['OR'], lab: 'R−', val: 'لـ − لمبة اليمين', color: nets.OR.c, face: 'down',
    tip: 'السلك رايح لـ <b>−</b> لمبة اليمين، في ⟦AA21⟧. الـ + بتاعها من فيوز 2A لوحده.' }
]

const rail = (net: string, s: number, ...pts: Hole[]): PerfTrace => ({ net, s, pts })

const busTraces: PerfTrace[] = (['BA', 'BB', 'BC', 'BD', 'BE'] as BusId[]).map(bus => {
  const right = Math.max(...MATRIX_DIODES.filter(d => d.bus === bus).map(d => d.x))
  return rail(bus, MATRIX, [0, BUS_ROW[bus]], [right, BUS_ROW[bus]])
})

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
  rail('GND', POWER, [0, 3], [0, 14]),

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

  rail('Q5', MATRIX, [12, 8], [12, 9], [8, 9]),
  rail('Q1', MATRIX, [13, 8], [13, 10], [11, 10]),
  rail('Q0', MATRIX, [14, 8], [14, 11], [12, 11]),
  rail('Q2', MATRIX, [15, 8], [15, 12], [14, 12]),
  rail('Q2', MATRIX, [15, 12], [16, 12]),
  rail('Q6', MATRIX, [16, 8], [16, 11], [17, 11]),
  rail('Q7', MATRIX, [17, 8], [17, 10], [19, 10]),
  rail('Q3', MATRIX, [18, 8], [18, 9], [21, 9]),
  rail('Q4', MATRIX, [18, 5], [18, 6], [22, 6], [22, 9]),
  rail('Q8', MATRIX, [19, 5], [19, 4], [23, 4], [23, 9]),
  ...busTraces,

  rail('GND', DRIVE, [0, 14], [25, 14]),
  rail('GND', DRIVE, [25, 11], [25, 17]),
  rail('GND', DRIVE, [26, 12], [25, 12]),
  rail('GND', DRIVE, [26, 16], [25, 16]),
  rail('GL', DRIVE, [28, 11], [27, 11], [27, 12]),
  rail('GR', DRIVE, [28, 17], [27, 17], [27, 16]),

  rail('SL', LEADS, [29, 13], [28, 13]),
  rail('SR', LEADS, [29, 15], [28, 15]),
  rail('OL', LEADS, [26, 11], [26, 0]),
  rail('OR', LEADS, [26, 17], [26, 20])
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
  R4: ['SL', 'GL'],
  R5: ['SR', 'GR'],
  R6: ['GL', 'GND'],
  R7: ['GR', 'GND'],
  Q1: ['GND', 'OL', 'GL'],
  Q2: ['GND', 'OR', 'GR']
}

export const patternLayout: PerfLayout = {
  cols: 30,
  rows: 21,
  parts,
  traces,
  nets
}

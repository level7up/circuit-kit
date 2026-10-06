import type { NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const SOCKETS = 2
export const POWER = 3
export const CLOCK = 4
export const BASES = 5
export const DRIVE = 6

const U1_NETS = ['CI', 'CK', 'GND', 'nc4', 'GND', 'nc6', 'GND', 'nc8', 'V5', 'nc10', 'V5', 'nc12', 'V5', 'V5']
const U3_NETS = ['ncq5', 'Q1', 'Q0', 'Q2', 'ncq6', 'ncq7', 'RST', 'GND', 'ncq8', 'ncq4', 'ncq9', 'ncco', 'GND', 'CK', 'RST', 'V5']

const dipLegs = (x0: number, bottom: number, top: number, count: number): [number, number][] =>
  Array.from({ length: count }, (_, i): [number, number] => (i < count / 2 ? [x0 + i, bottom] : [x0 + count - 1 - i, top]))

export const nets: Record<string, NetDef> = {
  IN: { n: 'دخل +12V (قبل الحماية)', c: '#e5484d' },
  V12: { n: '+12V بعد الحماية', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  V5: { n: '+5V', c: '#ff9f43' },
  CI: { n: 'دخل الساعة (المكثف)', c: '#7dd3fc' },
  CK: { n: 'نبضات الساعة', c: '#5aa9ff' },
  RST: { n: 'Reset (رجّع العدّاد)', c: '#f472b6' },
  Q0: { n: 'خرج Q0 ← A', c: '#a78bfa' },
  Q1: { n: 'خرج Q1 ← B', c: '#34d399' },
  Q2: { n: 'خرج Q2 ← C', c: '#fbbf24' },
  BA: { n: 'قاعدة ترانزستور A', c: '#c4b5fd' },
  BB: { n: 'قاعدة ترانزستور B', c: '#6ee7b7' },
  BC: { n: 'قاعدة ترانزستور C', c: '#fde68a' },
  A: { n: 'سالب حتة 1 و4 (A)', c: '#8b5cf6' },
  B: { n: 'سالب حتة 2 (B)', c: '#10b981' },
  C: { n: 'سالب حتة 3 (C)', c: '#f59e0b' }
}

const channel = (letter: 'A' | 'B' | 'C', x: number, q: string, pieces: string): PerfPart[] => [
  { id: 'R' + letter, k: 'res', s: BASES, legs: [[x, 11], [x, 13]], nets: [q, 'B' + letter], lab: 'R' + letter, val: '4.7kΩ', ohm: 4.7e3,
    tip: 'نايمة بالطول من ⟦' + col(x) + '12⟧ لـ ⟦' + col(x) + '14⟧. ملهاش اتجاه. بتحدّ التيار اللي داخل قاعدة الترانزستور.' },
  { id: 'Q' + letter, k: 'to92', s: DRIVE, legs: [[x + 1, 13], [x + 1, 14], [x + 1, 15]], nets: ['GND', 'B' + letter, letter], lab: 'Q' + letter, val: '2N2222', face: 'left',
    tip: 'واقف بالطول في العمود ⟦' + col(x + 1) + '⟧: الوش المسطح ناحية الشمال. E فوق في ⟦' + col(x + 1) + '14⟧، وB في النص ⟦' + col(x + 1) + '15⟧، وC تحت ⟦' + col(x + 1) + '16⟧.' },
  { id: 'P' + letter, k: 'pad', s: DRIVE, legs: [[x + 1, 17]], nets: [letter], lab: letter, val: 'سلك ' + pieces, color: nets[letter].c,
    tip: 'السلك اللي رايح لـ − ' + pieces + '، في ⟦' + col(x + 1) + '18⟧ تحت الترانزستور على طول.' }
]

function col(x: number): string {
  return String.fromCharCode(65 + x)
}

export const parts: PerfPart[] = [
  { id: 'U1', k: 'dip', s: SOCKETS, legs: dipLegs(3, 9, 6, 14), nets: U1_NETS, lab: 'U1', val: 'قاعدة 14 رجل', chip: 'CD40106',
    tip: 'قاعدة 14 رجل: الحز ناحية الشمال، رجل 1 في ⟦D10⟧ ورجل 14 في ⟦D7⟧. هنا هيدخل الـ CD40106 (الساعة).' },
  { id: 'U3', k: 'dip', s: SOCKETS, legs: dipLegs(14, 9, 6, 16), nets: U3_NETS, lab: 'U3', val: 'قاعدة 16 رجل', chip: 'CD4017',
    tip: 'قاعدة 16 رجل: الحز ناحية الشمال، رجل 1 في ⟦O10⟧ ورجل 16 في ⟦O7⟧. هنا هيدخل الـ CD4017 (العدّاد).' },

  { id: 'RED', k: 'pad', s: POWER, legs: [[0, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من الفيوز (+12V)، في ⟦A1⟧.' },
  { id: 'BLACK', k: 'pad', s: POWER, legs: [[0, 3]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'سلك الأرضي، في ⟦A4⟧.' },
  { id: 'D1', k: 'diode', s: POWER, legs: [[1, 0], [4, 0]], nets: ['IN', 'V12'], lab: 'D1', val: '1N4007',
    tip: 'نايم بالعرض من ⟦B1⟧ لـ ⟦E1⟧. الشريطة ناحية اليمين (⟦E1⟧).' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[5, 3], [5, 0]], nets: ['GND', 'V12'], lab: 'D2', val: 'P6KE18A', labelAt: [-1.1, 0],
    tip: 'نايم بالطول من ⟦F4⟧ لـ ⟦F1⟧. الشريطة لفوق (⟦F1⟧).' },
  { id: 'C1', k: 'can', s: POWER, legs: [[6, 0], [6, 3]], nets: ['V12', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) فوق في ⟦G1⟧، والشريطة (−) تحت في ⟦G4⟧.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[7, 0], [7, 3]], nets: ['V12', 'GND'], lab: 'C2', val: '100nF',
    tip: 'من ⟦H1⟧ لـ ⟦H4⟧. ملوش اتجاه.' },
  { id: 'U2', k: 'to220', s: POWER, legs: [[9, 1], [10, 1], [11, 1]], nets: ['V12', 'GND', 'V5'], lab: 'U2', val: '7805', face: 'down', labelAt: [0, 1.5],
    tip: 'رجوله بالعرض: IN في ⟦J2⟧، وGND في ⟦K2⟧، وOUT في ⟦L2⟧. الكتابة ناحيتك (لتحت) والضهر المعدن لفوق.' },
  { id: 'C3', k: 'ceramic', s: POWER, legs: [[12, 2], [12, 3]], nets: ['V5', 'GND'], lab: 'C3', val: '100nF',
    tip: 'بين ⟦M3⟧ و⟦M4⟧، جنب خرج الـ 7805. ملوش اتجاه.' },
  { id: 'C7', k: 'ceramic', s: POWER, legs: [[2, 5], [2, 4]], nets: ['V5', 'GND'], lab: 'C7', val: '100nF',
    tip: 'بين ⟦C5⟧ و⟦C6⟧، قريب من رجل 14 بتاعة U1. ملوش اتجاه.' },

  { id: 'R1', k: 'resUp', s: CLOCK, legs: [[3, 10], [4, 10]], nets: ['CI', 'CK'], lab: 'R1', val: '100kΩ', ohm: 100e3, labelAt: [1.6, 0.2],
    tip: 'واقفة بين ⟦D11⟧ و⟦E11⟧، تحت رجل 1 و2 بتوع U1 على طول. هي اللي بتحدد السرعة: أكبر = أبطأ.' },
  { id: 'C4', k: 'can', s: CLOCK, legs: [[2, 10], [2, 12]], nets: ['CI', 'GND'], lab: 'C4', val: '1µF',
    tip: 'الرجل الطويلة (+) في ⟦C11⟧، والقصيرة (−) في ⟦C13⟧.' },

  ...channel('B', 12, 'Q1', 'حتة 2'),
  ...channel('A', 16, 'Q0', 'حتة 1 وحتة 4'),
  ...channel('C', 19, 'Q2', 'حتة 3'),

  { id: 'PS', k: 'pad', s: DRIVE, legs: [[23, 17]], nets: ['V12'], lab: 'STRIP+', val: 'سلك أصفر', color: '#f5c518',
    tip: 'السلك اللي رايح لـ + كل حتت الشريط، في ⟦X18⟧.' }
]

export const traces: PerfTrace[] = [
{ net: 'CK', s: 4, pts: [[4, 9], [4, 10]] },
  { net: 'CK', s: 2, pts: [[4, 9], [4, 7], [16, 7], [16, 6]] },
  { net: 'RST', s: 2, pts: [[20, 9], [20, 7], [22, 7], [22, 5], [15, 5], [15, 6]] },
  { net: 'V5', s: 3, pts: [[11, 1], [12, 1], [12, 2]] },
  { net: 'V5', s: 3, pts: [[12, 2], [14, 2], [14, 6]] },
  { net: 'V5', s: 2, pts: [[14, 5], [8, 5], [8, 6]] },
  { net: 'V5', s: 2, pts: [[8, 5], [6, 5], [6, 6]] },
  { net: 'V5', s: 2, pts: [[6, 5], [4, 5], [4, 6]] },
  { net: 'V5', s: 2, pts: [[4, 6], [3, 6]] },
  { net: 'V5', s: 3, pts: [[4, 5], [2, 5]] },
  { net: 'Q0', s: 5, pts: [[16, 9], [16, 11]] },
  { net: 'Q1', s: 5, pts: [[15, 9], [15, 11], [12, 11]] },
  { net: 'Q2', s: 5, pts: [[17, 9], [17, 11], [19, 11]] },
  { net: 'BA', s: 6, pts: [[16, 13], [16, 14], [17, 14]] },
  { net: 'BB', s: 6, pts: [[12, 13], [12, 14], [13, 14]] },
  { net: 'BC', s: 6, pts: [[19, 13], [19, 14], [20, 14]] },
  { net: 'C', s: 6, pts: [[20, 15], [20, 17]] },
  { net: 'A', s: 6, pts: [[17, 15], [17, 17]] },
  { net: 'B', s: 6, pts: [[13, 15], [13, 17]] },
  { net: 'V12', s: 3, pts: [[4, 0], [5, 0]] },
  { net: 'V12', s: 3, pts: [[5, 0], [6, 0]] },
  { net: 'V12', s: 3, pts: [[6, 0], [7, 0]] },
  { net: 'V12', s: 3, pts: [[7, 0], [9, 0], [9, 1]] },
  { net: 'V12', s: 6, pts: [[9, 0], [23, 0], [23, 17]] },
  { net: 'GND', s: 3, pts: [[0, 3], [2, 3], [2, 4]] },
  { net: 'GND', s: 3, pts: [[2, 3], [5, 3]] },
  { net: 'GND', s: 3, pts: [[5, 3], [6, 3]] },
  { net: 'GND', s: 3, pts: [[6, 3], [7, 3]] },
  { net: 'GND', s: 3, pts: [[7, 3], [10, 3], [10, 1]] },
  { net: 'GND', s: 3, pts: [[10, 3], [12, 3]] },
  { net: 'GND', s: 4, pts: [[1, 3], [1, 12], [2, 12]] },
  { net: 'GND', s: 2, pts: [[1, 11], [5, 11], [5, 9]] },
  { net: 'GND', s: 2, pts: [[5, 10], [7, 10], [7, 9]] },
  { net: 'GND', s: 2, pts: [[7, 10], [9, 10], [9, 9]] },
  { net: 'GND', s: 6, pts: [[9, 10], [9, 12], [13, 12], [13, 13]] },
  { net: 'GND', s: 6, pts: [[13, 12], [17, 12], [17, 13]] },
  { net: 'GND', s: 6, pts: [[17, 12], [20, 12], [20, 13]] },
  { net: 'GND', s: 2, pts: [[20, 12], [21, 12], [21, 9]] },
  { net: 'GND', s: 2, pts: [[9, 9], [9, 8], [17, 8], [17, 6]] },
  { net: 'CI', s: 4, pts: [[3, 9], [3, 10]] },
  { net: 'CI', s: 4, pts: [[3, 10], [2, 10]] },
  { net: 'IN', s: 3, pts: [[0, 0], [1, 0]] }
]

export const chaseLayout: PerfLayout = {
  cols: 26,
  rows: 18,
  parts,
  traces,
  nets
}

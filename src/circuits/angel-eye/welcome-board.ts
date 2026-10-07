import type { NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const W_SOCKET = 2
export const W_POWER = 3
export const W_TIMER = 4
export const W_SWITCH = 5
export const W_LEADS = 6

const U3_NETS = ['WT', 'PG', 'GND', 'nc4', 'GND', 'nc6', 'GND', 'nc8', 'VW', 'nc10', 'VW', 'nc12', 'VW', 'VW']

const dipLegs = (x0: number, bottom: number, top: number, count: number): [number, number][] =>
  Array.from({ length: count }, (_, i): [number, number] => (i < count / 2 ? [x0 + i, bottom] : [x0 + count - 1 - i, top]))

export const welcomeNets: Record<string, NetDef> = {
  BAT: { n: '+12V دايم من البطارية (بعد الفيوز)', c: '#e5484d' },
  VW: { n: '+12V بعد الحماية', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' },
  LK: { n: 'سلك القفل', c: '#22c55e' },
  UL: { n: 'سلك الفتح', c: '#a855f7' },
  TRG: { n: 'نبضة السنتر لوك', c: '#86efac' },
  WT: { n: 'مكثف التايمر C9', c: '#7dd3fc' },
  PG: { n: 'بوابة الموسفت (G)', c: '#5aa9ff' },
  OUT: { n: 'خارج للحلقتين', c: '#f5c518' }
}

export const welcomeSchematic: Record<string, string[]> = {
  D3: ['BAT', 'VW'],
  D4: ['GND', 'VW'],
  C11: ['GND', 'VW'],
  D5: ['LK', 'TRG'],
  D6: ['UL', 'TRG'],
  R12: ['TRG', 'WT'],
  C9: ['WT', 'GND'],
  R13: ['WT', 'GND'],
  U3: U3_NETS,
  Q2: ['PG', 'OUT', 'VW']
}

const parts: PerfPart[] = [
  { id: 'U3', k: 'dip', s: W_SOCKET, legs: dipLegs(6, 6, 3, 14), nets: U3_NETS, lab: 'U3', val: 'قاعدة 14 رجل', chip: 'CD40106',
    tip: 'قاعدة 14 رجل: الحز ناحية الشمال، رجل 1 في ⟦G7⟧ ورجل 14 في ⟦G4⟧. هنا هيدخل الـ CD40106 (التايمر).' },

  { id: 'D3', k: 'diode', s: W_POWER, legs: [[2, 2], [4, 2]], nets: ['BAT', 'VW'], lab: 'D3', val: '1N4007',
    tip: 'نايم بالعرض من ⟦C3⟧ لـ ⟦E3⟧. الشريطة ناحية اليمين (⟦E3⟧). بيمنع الكهربا لو السلكين اتعكسوا.' },
  { id: 'D4', k: 'tvs', s: W_POWER, legs: [[5, 0], [5, 2]], nets: ['GND', 'VW'], lab: 'D4', val: 'P6KE18A',
    tip: 'نايم بالطول من ⟦F1⟧ لـ ⟦F3⟧. الشريطة لتحت (⟦F3⟧). بيشرب النبضات العالية عشان الشريحة والموسفت.' },
  { id: 'C11', k: 'ceramic', s: W_POWER, legs: [[8, 0], [8, 2]], nets: ['GND', 'VW'], lab: 'C11', val: '100nF',
    tip: 'بين ⟦I1⟧ و⟦I3⟧، قريب من رجل 14. ملوش اتجاه.' },

  { id: 'D5', k: 'diode', s: W_TIMER, legs: [[2, 4], [4, 4]], nets: ['LK', 'TRG'], lab: 'D5', val: '1N4007',
    tip: 'نايم بالعرض من ⟦C5⟧ لـ ⟦E5⟧. الشريطة ناحية اليمين (⟦E5⟧). بيعدّي نبضة القفل بس.' },
  { id: 'D6', k: 'diode', s: W_TIMER, legs: [[2, 6], [4, 6]], nets: ['UL', 'TRG'], lab: 'D6', val: '1N4007', labelAt: [0, 0.9],
    tip: 'نايم بالعرض من ⟦C7⟧ لـ ⟦E7⟧. الشريطة ناحية اليمين (⟦E7⟧). بيعدّي نبضة الفتح بس.' },
  { id: 'R12', k: 'resUp', s: W_TIMER, legs: [[4, 5], [5, 5]], nets: ['TRG', 'WT'], lab: 'R12', val: '1kΩ', ohm: 1e3, labelAt: [0.5, -0.9],
    tip: 'واقفة بين ⟦E6⟧ و⟦F6⟧. بتملا المكثف بسرعة من غير ما تشد تيار كبير من سلك القفل.' },
  { id: 'C9', k: 'can', s: W_TIMER, legs: [[5, 7], [5, 9]], nets: ['WT', 'GND'], lab: 'C9', val: '100µF',
    tip: 'الرجل الطويلة (+) فوق في ⟦F8⟧، والشريطة (−) تحت في ⟦F10⟧. ده اللي بيحفظ الـ 5 ثواني.' },
  { id: 'R13', k: 'res', s: W_TIMER, legs: [[7, 7], [7, 9]], nets: ['WT', 'GND'], lab: 'R13', val: '56kΩ', ohm: 56e3,
    tip: 'نايمة بالطول من ⟦H8⟧ لـ ⟦H10⟧. بتفضّي المكثف على مهلها: 56k = حوالي 5 ثواني، 100k = حوالي 9.' },

  { id: 'Q2', k: 'to220', s: W_SWITCH, legs: [[13, 7], [14, 7], [15, 7]], nets: ['PG', 'OUT', 'VW'], lab: 'Q2', val: 'IRF9540N', face: 'down', labelAt: [0, 1.5],
    tip: 'رجوله بالعرض: G في ⟦N8⟧، وD في ⟦O8⟧، وS في ⟦P8⟧. الكتابة ناحيتك (لتحت) والضهر المعدن لفوق. مش محتاج مشتت: بيسخن أقل من 0.01 وات.' },

  { id: 'BLACK', k: 'pad', s: W_LEADS, legs: [[0, 9]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'الأرضي (شاسيه العربية)، في ⟦A10⟧.' },
  { id: 'RED', k: 'pad', s: W_LEADS, legs: [[1, 2]], nets: ['BAT'], lab: 'BAT+', val: 'سلك أحمر', color: '#e5484d',
    tip: '+12V دايم من البطارية بعد فيوز 1A، في ⟦B3⟧.' },
  { id: 'LOCK', k: 'pad', s: W_LEADS, legs: [[1, 4]], nets: ['LK'], lab: 'LOCK', val: 'سلك أخضر', color: '#22c55e',
    tip: 'السلك اللي بيجيب 12V لما تقفل العربية، في ⟦B5⟧.' },
  { id: 'UNLOCK', k: 'pad', s: W_LEADS, legs: [[1, 6]], nets: ['UL'], lab: 'UNLOCK', val: 'سلك بنفسجي', color: '#a855f7',
    tip: 'السلك اللي بيجيب 12V لما تفتح العربية، في ⟦B7⟧.' },
  { id: 'YELLOW', k: 'pad', s: W_LEADS, legs: [[16, 9]], nets: ['OUT'], lab: 'OUT', val: 'سلك أصفر', color: '#f5c518',
    tip: 'رايح للسلك الأحمر (IN) بتاع بورد الحلقتين، في ⟦Q10⟧.' }
]

const traces: PerfTrace[] = [
  { net: 'GND', s: W_POWER, pts: [[0, 9], [0, 0], [8, 0]] },
  { net: 'GND', s: W_POWER, pts: [[0, 9], [12, 9]] },
  { net: 'GND', s: W_POWER, pts: [[8, 6], [8, 9]] },
  { net: 'GND', s: W_POWER, pts: [[10, 6], [10, 9]] },
  { net: 'GND', s: W_POWER, pts: [[12, 6], [12, 9]] },
  { net: 'BAT', s: W_POWER, pts: [[1, 2], [2, 2]] },
  { net: 'VW', s: W_POWER, pts: [[4, 2], [15, 2]] },
  { net: 'VW', s: W_POWER, pts: [[6, 2], [6, 3]] },
  { net: 'VW', s: W_POWER, pts: [[7, 2], [7, 3]] },
  { net: 'VW', s: W_POWER, pts: [[9, 2], [9, 3]] },
  { net: 'VW', s: W_POWER, pts: [[11, 2], [11, 3]] },
  { net: 'LK', s: W_TIMER, pts: [[1, 4], [2, 4]] },
  { net: 'UL', s: W_TIMER, pts: [[1, 6], [2, 6]] },
  { net: 'TRG', s: W_TIMER, pts: [[4, 4], [4, 6]] },
  { net: 'WT', s: W_TIMER, pts: [[5, 5], [5, 7]] },
  { net: 'WT', s: W_TIMER, pts: [[5, 6], [6, 6], [6, 7], [7, 7]] },
  { net: 'PG', s: W_SWITCH, pts: [[7, 6], [7, 5], [13, 5], [13, 7]] },
  { net: 'VW', s: W_SWITCH, pts: [[15, 2], [15, 7]] },
  { net: 'OUT', s: W_SWITCH, pts: [[14, 7], [14, 9], [16, 9]] }
]

export const welcomeLayout: PerfLayout = {
  cols: 17,
  rows: 10,
  parts,
  traces,
  nets: welcomeNets
}

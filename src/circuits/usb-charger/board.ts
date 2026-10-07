import type { NetDef, PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

export const DIODE = 2
export const GUARDS = 3
export const LEADS = 4

export const nets: Record<string, NetDef> = {
  IN: { n: '+12V من الكونتاكت (بعد الفيوز)', c: '#e5484d' },
  VP: { n: '+12V بعد الحماية', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' }
}

export const SCHEMATIC: Record<string, string[]> = {
  D1: ['IN', 'VP'],
  D2: ['GND', 'VP'],
  C1: ['VP', 'GND'],
  C2: ['VP', 'GND']
}

const parts: PerfPart[] = [
  { id: 'D1', k: 'diode', s: DIODE, legs: [[1, 0], [5, 0]], nets: ['IN', 'VP'], lab: 'D1', val: '1N5408', labelAt: [0, 1],
    tip: 'نايم بالعرض من ⟦B1⟧ لـ ⟦F1⟧. الشريطة ناحية اليمين (⟦F1⟧). رجوله تخينة: وسّع الخرمين الأول. بيمنع الكهربا لو السلكين اتعكسوا.' },

  { id: 'D2', k: 'tvs', s: GUARDS, legs: [[7, 3], [7, 0]], nets: ['GND', 'VP'], lab: 'D2', val: 'P6KE18A',
    tip: 'واقف بالطول من ⟦H4⟧ لـ ⟦H1⟧. الشريطة لفوق (⟦H1⟧). بيشرب النبضات العالية اللي بتطلع من الدينامو.' },
  { id: 'C1', k: 'ceramic', s: GUARDS, legs: [[9, 1], [9, 2]], nets: ['VP', 'GND'], lab: 'C1', val: '100nF',
    tip: 'بين ⟦J2⟧ و⟦J3⟧. ملوش اتجاه. بينضّف الشوشرة السريعة.' },
  { id: 'C2', k: 'can', s: GUARDS, legs: [[11, 1], [11, 2]], nets: ['VP', 'GND'], lab: 'C2', val: '100µF',
    tip: 'الرجل الطويلة (+) فوق في ⟦L2⟧، والشريطة (−) تحت في ⟦L3⟧. بيثبّت الجهد لما الموبايلات تسحب مرة واحدة.' },

  { id: 'RED', k: 'pad', s: LEADS, legs: [[0, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من الفيوز 3A على سلك الكونتاكت (ACC)، في ⟦A1⟧.' },
  { id: 'VMP', k: 'pad', s: LEADS, legs: [[0, 1]], nets: ['IN'], lab: 'VM+', val: 'أحمر الفولتميتر', color: '#ff9a9a',
    tip: 'السلك الأحمر بتاع الفولتميتر، في ⟦A2⟧. قبل الدايود، فبيقرا جهد البطارية بالظبط.' },
  { id: 'VMN', k: 'pad', s: LEADS, legs: [[0, 2]], nets: ['GND'], lab: 'VM−', val: 'أسود الفولتميتر', color: '#555',
    tip: 'السلك الأسود بتاع الفولتميتر، في ⟦A3⟧.' },
  { id: 'BLACK', k: 'pad', s: LEADS, legs: [[0, 3]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'الأرضي (مسمار شاسيه)، في ⟦A4⟧.' },
  { id: 'OUTP', k: 'pad', s: LEADS, legs: [[13, 0]], nets: ['VP'], lab: 'IN+', val: 'للموديول', color: '#ff9f43',
    tip: 'رايح لـ IN+ في موديول الـ USB، في ⟦N1⟧.' },
  { id: 'OUTN', k: 'pad', s: LEADS, legs: [[13, 3]], nets: ['GND'], lab: 'IN−', val: 'للموديول', color: '#4a5263',
    tip: 'رايح لـ IN− في موديول الـ USB، في ⟦N4⟧.' }
]

const traces: PerfTrace[] = [
  { net: 'IN', s: DIODE, pts: [[0, 0], [1, 0]] },
  { net: 'IN', s: DIODE, pts: [[0, 0], [0, 1]] },
  { net: 'VP', s: GUARDS, pts: [[5, 0], [13, 0]] },
  { net: 'VP', s: GUARDS, pts: [[9, 0], [9, 1]] },
  { net: 'VP', s: GUARDS, pts: [[11, 0], [11, 1]] },
  { net: 'GND', s: GUARDS, pts: [[0, 2], [0, 3], [13, 3]] },
  { net: 'GND', s: GUARDS, pts: [[9, 2], [9, 3]] },
  { net: 'GND', s: GUARDS, pts: [[11, 2], [11, 3]] }
]

export const chargerLayout: PerfLayout = {
  cols: 14,
  rows: 4,
  parts,
  traces,
  nets
}

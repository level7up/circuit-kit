import type { NetDef, PerfLayout, PerfPart } from '../../types/circuit'
import { stripsToTraces } from '../../lib/perfboard/strips'

export const PARTS = 2
export const LEADS = 3

export const nets: Record<string, NetDef> = {
  IN: { n: 'دخل الركن (قبل الحماية)', c: '#e5484d' },
  VP: { n: '+12V بعد الحماية', c: '#ffb547' },
  GND: { n: 'الأرضي', c: '#9aa6bd' }
}

export const SCHEMATIC: Record<string, string[]> = {
  D1: ['IN', 'VP'],
  D2: ['GND', 'VP'],
  C1: ['GND', 'VP'],
  RED: ['IN'],
  BLACK: ['GND'],
  YELLOW: ['VP'],
  BLUE: ['GND']
}

export const veroParts: PerfPart[] = [
  { id: 'D1', k: 'diode', s: PARTS, legs: [[4, 0], [4, 2]], nets: ['IN', 'VP'], lab: 'D1', val: '1N4007',
    tip: 'نايم بالطول من ⟦E1⟧ لـ ⟦E3⟧. الشريطة لتحت (⟦E3⟧). بيمنع الكهربا لو السلكين اتعكسوا.' },
  { id: 'D2', k: 'tvs', s: PARTS, legs: [[6, 4], [6, 2]], nets: ['GND', 'VP'], lab: 'D2', val: 'P6KE18A',
    tip: 'نايم بالطول من ⟦G5⟧ لـ ⟦G3⟧. الشريطة لفوق (⟦G3⟧). بيشرب النبضات العالية اللي بتطلع من الدينامو.' },
  { id: 'C1', k: 'ceramic', s: PARTS, legs: [[2, 4], [2, 2]], nets: ['GND', 'VP'], lab: 'C1', val: '100nF',
    tip: 'بين ⟦C3⟧ و⟦C5⟧. ملوش اتجاه.' },

  { id: 'RED', k: 'pad', s: LEADS, legs: [[0, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من سلك لمبة الركن (بعد الفيوز)، في ⟦A1⟧.' },
  { id: 'BLACK', k: 'pad', s: LEADS, legs: [[0, 4]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'سلك الأرضي (شاسيه العربية أو سالب الأدابتر)، في ⟦A5⟧.' },
  { id: 'YELLOW', k: 'pad', s: LEADS, legs: [[9, 2]], nets: ['VP'], lab: 'RING+', val: 'سلك أصفر', color: '#f5c518',
    tip: 'رايح لـ + الحلقتين، في ⟦J3⟧.' },
  { id: 'BLUE', k: 'pad', s: LEADS, legs: [[9, 4]], nets: ['GND'], lab: 'RING−', val: 'سلك أزرق', color: '#3b82f6',
    tip: 'رايح لـ − الحلقتين، في ⟦J5⟧.' }
]

export const veroLayout: PerfLayout = {
  cols: 10,
  rows: 5,
  strips: { axis: 'rows', cuts: [] },
  parts: veroParts,
  traces: [],
  nets
}

export const dotLayout: PerfLayout = {
  cols: veroLayout.cols,
  rows: veroLayout.rows,
  parts: veroParts,
  traces: stripsToTraces(veroLayout),
  nets
}

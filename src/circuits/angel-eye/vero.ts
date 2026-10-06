import type { NetDef, PerfLayout, PerfPart } from '../../types/circuit'
import { stripsToTraces } from '../../lib/perfboard/strips'

export const POWER = 2
export const FADE = 3
export const DRIVE = 4

export const nets: Record<string, NetDef> = {
  IN: { n: 'دخل الركن (قبل الحماية)', c: '#e5484d' },
  VP: { n: '+12V بعد الحماية', c: '#ffb547' },
  S: { n: 'نقطة الفيد S', c: '#b58cff' },
  B: { n: 'قاعدة الترانزستور', c: '#5aa9ff' },
  C: { n: 'سالب الحلقة', c: '#22c3ee' },
  GND: { n: 'الأرضي', c: '#9aa6bd' }
}

export const SCHEMATIC: Record<string, string[]> = {
  RED: ['IN'],
  BLACK: ['GND'],
  D1: ['IN', 'VP'],
  D2: ['GND', 'VP'],
  C1: ['GND', 'VP'],
  L1: ['GND', 'GND'],
  YELLOW: ['VP'],
  R1: ['VP', 'S'],
  C2: ['S', 'GND'],
  R2: ['S', 'B'],
  Q1: ['B', 'C', 'GND'],
  BLUE: ['C']
}

export const veroParts: PerfPart[] = [
  { id: 'RED', k: 'pad', s: POWER, legs: [[15, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من سلك لمبة الركن (بعد الفيوز)، في ⟦P1⟧.' },
  { id: 'BLACK', k: 'pad', s: POWER, legs: [[15, 1]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'سلك الأرضي (شاسيه العربية أو سالب الأدابتر)، في ⟦P2⟧.' },
  { id: 'D1', k: 'diode', s: POWER, legs: [[12, 0], [12, 3]], nets: ['IN', 'VP'], lab: 'D1', val: '1N4007',
    tip: 'نايم بالطول من ⟦M1⟧ لـ ⟦M4⟧. الشريطة لتحت (⟦M4⟧). بيمنع الكهربا لو السلكين اتعكسوا.' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[10, 1], [10, 3]], nets: ['GND', 'VP'], lab: 'D2', val: 'P6KE18A',
    tip: 'نايم بالطول من ⟦K2⟧ لـ ⟦K4⟧. الشريطة لتحت (⟦K4⟧). بيشرب النبضات العالية اللي بتطلع من الدينامو.' },
  { id: 'C1', k: 'ceramic', s: POWER, legs: [[8, 1], [8, 3]], nets: ['GND', 'VP'], lab: 'C1', val: '100nF',
    tip: 'بين ⟦I2⟧ و⟦I4⟧. ملوش اتجاه.' },
  { id: 'L1', k: 'wire', s: POWER, legs: [[0, 1], [0, 7]], nets: ['GND', 'GND'], lab: '', val: 'سلكة', color: '#3a3a3a',
    tip: 'سلكة معزولة من ⟦A2⟧ لـ ⟦A8⟧: بتوصّل خط الأرضي اللي فوق بخط الأرضي اللي تحت.' },
  { id: 'YELLOW', k: 'pad', s: POWER, legs: [[15, 3]], nets: ['VP'], lab: 'RING+', val: 'سلك أصفر', color: '#f5c518',
    tip: 'رايح لـ + الحلقة (أو الحلقتين)، في ⟦P4⟧.' },

  { id: 'R1', k: 'resUp', s: FADE, legs: [[6, 3], [6, 4]], nets: ['VP', 'S'], lab: 'R1', val: '10kΩ', ohm: 10e3,
    tip: 'واقفة بين ⟦G4⟧ و⟦G5⟧. هي اللي بتشحن المكثف بالراحة.' },
  { id: 'C2', k: 'can', s: FADE, legs: [[4, 4], [4, 7]], nets: ['S', 'GND'], lab: 'C2', val: '100µF',
    tip: 'الرجل الطويلة (+) في ⟦E5⟧، والقصيرة (−) في ⟦E8⟧. ده مكثف الفيد: أكبر = فيد أبطأ.' },
  { id: 'R2', k: 'resUp', s: FADE, legs: [[2, 4], [2, 5]], nets: ['S', 'B'], lab: 'R2', val: '22kΩ', ohm: 22e3,
    tip: 'واقفة بين ⟦C5⟧ و⟦C6⟧. بتوصّل المكثف بقاعدة الترانزستور.' },

  { id: 'Q1', k: 'to220', s: DRIVE, legs: [[9, 5], [9, 6], [9, 7]], nets: ['B', 'C', 'GND'], lab: 'Q1', val: 'TIP122', face: 'right',
    tip: 'رجوله بالطول في العمود ⟦J⟧: B في ⟦J6⟧، وC في ⟦J7⟧، وE في ⟦J8⟧. الكتابة ناحية اليمين، والضهر المعدن ناحية الشمال ومايلمسش حاجة.' },
  { id: 'BLUE', k: 'pad', s: DRIVE, legs: [[15, 6]], nets: ['C'], lab: 'RING−', val: 'سلك أزرق', color: '#3b82f6',
    tip: 'رايح لـ − الحلقة (أو الحلقتين)، في ⟦P7⟧.' }
]

export const veroLayout: PerfLayout = {
  cols: 16,
  rows: 8,
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

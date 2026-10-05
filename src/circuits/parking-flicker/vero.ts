import type { PerfLayout, PerfPart, StripCut } from '../../types/circuit'
import { stripsToTraces } from '../../lib/perfboard/strips'
import { perfLayout } from './perfboard'

const SOCKET = 2
const POWER = 3
const OSC = 4
const MIX = 5
const DRIVE = 6
const GND_WIRE = '#3a3a3a'

const DIP_NETS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'GND', 'nc8', 'GND', 'nc10', 'GND', 'nc12', 'GND', 'V5']

const link = (id: string, net: string, x: number, y0: number, y1: number, tip: string): PerfPart => ({
  id, k: 'wire', s: POWER, legs: [[x, y0], [x, y1]], nets: [net, net], lab: '', val: 'سلكة', color: GND_WIRE, tip
})

export const veroParts: PerfPart[] = [
  { id: 'U1', k: 'dip', s: SOCKET, legs: DIP_NETS.map((_, i): [number, number] => (i < 7 ? [6, 2 + i] : [9, 15 - i])), nets: DIP_NETS, lab: 'U1', val: 'قاعدة 14 رجل',
    tip: 'القاعدة واقفة بالطول: الحز لفوق، ورجل 1 في G3 ورجل 14 في J3. النحاس اللي تحتها لازم يكون مقطوع في العمود H.' },

  { id: 'RED', k: 'pad', s: POWER, legs: [[23, 0]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر الجاي من الفيوز، في X1.' },
  { id: 'BLACK', k: 'pad', s: POWER, legs: [[23, 1]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'سلك الأرضي، في X2.' },
  { id: 'D1', k: 'diode', s: POWER, legs: [[21, 0], [21, 4]], nets: ['IN', 'V12'], lab: 'D1', val: '1N4007',
    tip: 'نايم بالطول من V1 لـ V5. الشريطة لتحت (V5).' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[19, 1], [19, 4]], nets: ['GND', 'V12'], lab: 'D2', val: 'P6KE18A',
    tip: 'نايم بالطول من T2 لـ T5. الشريطة لتحت (T5).' },
  { id: 'C1', k: 'can', s: POWER, legs: [[17, 4], [17, 3]], nets: ['V12', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) في R5، والشريطة (−) في R4.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[18, 4], [18, 3]], nets: ['V12', 'GND'], lab: 'C2', val: '100nF',
    tip: 'بين S4 وS5. ملوش اتجاه.' },
  { id: 'U2', k: 'to220', s: POWER, legs: [[14, 4], [14, 3], [14, 2]], nets: ['V12', 'GND', 'V5'], lab: 'U2', val: '7805', face: 'right',
    tip: 'رجوله بالطول في العمود O: IN في O5، وGND في O4، وOUT في O3. الكتابة ناحية اليمين.' },
  { id: 'C3', k: 'ceramic', s: POWER, legs: [[15, 2], [15, 3]], nets: ['V5', 'GND'], lab: 'C3', val: '100nF',
    tip: 'بين P3 وP4، لازق في الـ 7805.' },
  { id: 'C7', k: 'ceramic', s: POWER, legs: [[10, 2], [10, 3]], nets: ['V5', 'GND'], lab: 'C7', val: '100nF',
    tip: 'بين K3 وK4، لازق في رجل 14 و13.' },
  link('L1', 'GND', 0, 1, 8, 'سلكة معزولة من A2 لـ A9: بتوصّل رجل 7 بالأرضي.'),
  link('L2', 'GND', 13, 1, 3, 'من N2 لـ N4: خط الأرضي اللي فوق بأرضي الـ 7805 والـ IC.'),
  link('L3', 'GND', 12, 3, 5, 'من M4 لـ M6: رجل 13 برجل 11.'),
  link('L4', 'GND', 11, 5, 7, 'من L6 لـ L8: رجل 11 برجل 9.'),

  { id: 'R1', k: 'resUp', s: OSC, legs: [[5, 2], [5, 3]], nets: ['P1', 'P2'], lab: 'R1', val: '1MΩ', ohm: 1e6,
    tip: 'واقفة بين F3 وF4، جنب رجل 1 و2.' },
  { id: 'R2', k: 'resUp', s: OSC, legs: [[5, 4], [5, 5]], nets: ['P3', 'P4'], lab: 'R2', val: '390kΩ', ohm: 390e3,
    tip: 'واقفة بين F5 وF6، جنب رجل 3 و4.' },
  { id: 'R3', k: 'resUp', s: OSC, legs: [[5, 6], [5, 7]], nets: ['P5', 'P6'], lab: 'R3', val: '100kΩ', ohm: 100e3,
    tip: 'واقفة بين F7 وF8، جنب رجل 5 و6.' },
  { id: 'C4', k: 'can', s: OSC, legs: [[4, 2], [4, 1]], nets: ['P1', 'GND'], lab: 'C4', val: '1µF',
    tip: 'الطويلة (+) في E3، والقصيرة (−) في E2.' },
  { id: 'C5', k: 'can', s: OSC, legs: [[3, 4], [3, 1]], nets: ['P3', 'GND'], lab: 'C5', val: '1µF',
    tip: 'افرد رجليه: الطويلة (+) في D5، والقصيرة (−) في D2.' },
  { id: 'C6', k: 'can', s: OSC, legs: [[4, 6], [4, 8]], nets: ['P5', 'GND'], lab: 'C6', val: '1µF',
    tip: 'الطويلة (+) في E7، والقصيرة (−) في E9.' },

  { id: 'R4', k: 'res', s: MIX, legs: [[1, 3], [1, 9]], nets: ['P2', 'N'], lab: 'R4', val: '10kΩ', ohm: 10e3,
    tip: 'نايمة بالطول من B4 لـ B10.' },
  { id: 'R5', k: 'res', s: MIX, legs: [[2, 5], [2, 9]], nets: ['P4', 'N'], lab: 'R5', val: '22kΩ', ohm: 22e3,
    tip: 'نايمة بالطول من C6 لـ C10.' },
  { id: 'R6', k: 'resUp', s: MIX, legs: [[3, 7], [3, 9]], nets: ['P6', 'N'], lab: 'R6', val: '47kΩ', ohm: 47e3,
    tip: 'واقفة من D8 لـ D10.' },
  { id: 'C8', k: 'can', s: MIX, legs: [[5, 9], [5, 8]], nets: ['N', 'GND'], lab: 'C8', val: '22µF',
    tip: 'الطويلة (+) في F10 (خط N)، والقصيرة (−) في F9.' },
  { id: 'R7', k: 'res', s: MIX, legs: [[16, 2], [16, 9]], nets: ['V5', 'N'], lab: 'R7', val: '10kΩ', ohm: 10e3,
    tip: 'نايمة بالطول من Q3 (5V) لـ Q10 (خط N).' },

  { id: 'Q1', k: 'to220', s: DRIVE, legs: [[18, 9], [18, 8], [18, 7]], nets: ['N', 'C', 'E'], lab: 'Q1', val: 'TIP122', face: 'right',
    tip: 'رجوله بالطول في العمود S: B في S10، وC في S9، وE في S8. الكتابة ناحية اليمين، والضهر المعدن ناحية الشمال ومايلمسش حاجة.' },
  { id: 'R8', k: 'resUp', s: DRIVE, legs: [[14, 7], [14, 5]], nets: ['E', 'GND'], lab: 'R8', val: '68Ω', ohm: 68,
    tip: 'واقفة من O8 لـ O6. لو معاكش 68Ω: 100Ω هنا وفي R9 وR10.' },
  { id: 'R9', k: 'resUp', s: DRIVE, legs: [[15, 7], [15, 5]], nets: ['E', 'GND'], lab: 'R9', val: '68Ω', ohm: 68,
    tip: 'واقفة من P8 لـ P6، زي R8.' },
  { id: 'R10', k: 'resUp', s: DRIVE, legs: [[20, 7], [20, 5]], nets: ['E', 'GND'], lab: 'R10', val: 'اختياري', ohm: 100, optional: true,
    tip: 'مكان احتياطي من U8 لـ U6: لـ 3 × 100Ω، أو 3 × 68Ω للمبتين.' },
  { id: 'R11', k: 'resUp', s: DRIVE, legs: [[22, 7], [22, 5]], nets: ['E', 'GND'], lab: 'R11', val: 'اختياري', ohm: 100, optional: true,
    tip: 'مكان احتياطي من W8 لـ W6: بس للمبتين بـ 4 × 100Ω.' },
  { id: 'YELLOW', k: 'pad', s: DRIVE, legs: [[23, 4]], nets: ['V12'], lab: 'LAMP+', val: 'سلك أصفر', color: '#f5c518',
    tip: 'رايح لموجب فيشة اللمبة، في X5.' },
  { id: 'BLUE', k: 'pad', s: DRIVE, legs: [[23, 8]], nets: ['C'], lab: 'LAMP−', val: 'سلك أزرق', color: '#3b82f6',
    tip: 'رايح لسالب فيشة اللمبة، في X9.' }
]

const UNDER_IC = 7
const veroCuts: StripCut[] = [
  ...[2, 3, 4, 5, 6, 7, 8].map(strip => ({ strip, at: UNDER_IC })),
  { strip: 4, at: 10 },
  { strip: 6, at: 10 },
  { strip: 8, at: 10 },
  { strip: 7, at: 12 }
]

export const veroLayout: PerfLayout = {
  cols: 24,
  rows: 10,
  strips: { axis: 'rows', cuts: veroCuts },
  parts: veroParts,
  traces: [],
  nets: perfLayout.nets
}

const DOT_SOCKET_TIP = 'القاعدة واقفة بالطول: الحز لفوق، ورجل 1 في G3 ورجل 14 في J3. على البورد النقط مفيش قطع، بس اتأكد إن مفيش قصدير واصل بين رجلين.'

export const dotLayout: PerfLayout = {
  cols: veroLayout.cols,
  rows: veroLayout.rows,
  parts: veroParts.map(p => (p.id === 'U1' ? { ...p, tip: DOT_SOCKET_TIP } : p)),
  traces: stripsToTraces(veroLayout),
  nets: perfLayout.nets
}

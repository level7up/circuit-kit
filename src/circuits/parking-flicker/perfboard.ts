import type { PerfLayout, PerfPart, PerfTrace } from '../../types/circuit'

const SOCKET = 2
const POWER = 3
const OSC = 4
const MIX = 5
const DRIVE = 6

const DIP_NETS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'GND', 'nc8', 'GND', 'nc10', 'GND', 'nc12', 'GND', 'V5']
const dipLegs = (x0: number, bottom: number, top: number): [number, number][] =>
  DIP_NETS.map((_, i) => (i < 7 ? [x0 + i, bottom] : [x0 + 13 - i, top]))

const FEEDBACK: Record<string, string> = { R1: '1MΩ', R2: '390kΩ', R3: '100kΩ' }

const oscillator = (n: number, x: number, r: string, ohm: number, c: string): PerfPart[] => [
  {
    id: r, k: 'resUp', s: OSC, legs: [[x, 10], [x + 1, 10]], nets: [`P${2 * n - 1}`, `P${2 * n}`],
    lab: r, val: FEEDBACK[r], ohm,
    tip: `واقفة: اثني رجل على جسمها لتحت، وحط الرجلين في خرمين جنب بعض تحت رجل ${2 * n - 1} ورجل ${2 * n} بتوع القاعدة بالظبط. ملهاش اتجاه.`
  },
  {
    id: c, k: 'can', s: OSC, legs: [[x, 16], [x, 18]], nets: [`P${2 * n - 1}`, 'GND'],
    lab: c, val: '1µF',
    tip: 'الرجل الطويلة (+) فوق ناحية الـ IC، والشريطة (−) تحت ناحية خط الأرضي. فيه خرم فاضي بين الرجلين: الوصلة اللي تحته هي خط N، متلحمش الرجل فيه.'
  }
]

const mixer = (id: string, x: number, val: string, ohm: number, from: string, partner: string): PerfPart => ({
  id, k: 'res', s: MIX, legs: [[x, 11], [x, 15]], nets: [from, 'N'], lab: id, val, ohm,
  tip: `نايمة بالطول. الرجل اللي فوق تحت رجل ${partner} الواقفة على طول، واللي تحت بتنزل لخط N. ملهاش اتجاه.`
})

export const perfParts: PerfPart[] = [
  { id: 'U1', k: 'dip', s: SOCKET, legs: dipLegs(12, 9, 6), nets: DIP_NETS, lab: 'U1', val: 'قاعدة 14 رجل',
    tip: 'القاعدة الأول ومن غير الـ IC. الحز (النص دايرة) ناحية الشمال. لحّم ركنين عكس بعض، اتأكد إنها نايمة لازقة في البورد، وبعدين كمّل الباقي.' },

  { id: 'RED', k: 'pad', s: POWER, legs: [[0, 4]], nets: ['IN'], lab: 'IN', val: 'سلك أحمر', color: '#e5484d',
    tip: 'السلك الأحمر اللي جاي من الفيوز. دخّله من الخرم من فوق ولحّمه من تحت.' },
  { id: 'BLACK', k: 'pad', s: POWER, legs: [[0, 19]], nets: ['GND'], lab: 'GND', val: 'سلك أسود', color: '#3a3a3a',
    tip: 'سلك الأرضي (السالب) بتاع العربية.' },
  { id: 'D1', k: 'diode', s: POWER, legs: [[1, 4], [1, 0]], nets: ['IN', 'V12'], lab: 'D1', val: '1N4007',
    tip: 'الشريطة الفضي لفوق ناحية خط +12V. لو اتعكس، الدايرة مش هتشتغل خالص.' },
  { id: 'D2', k: 'tvs', s: POWER, legs: [[3, 4], [3, 0]], nets: ['GND', 'V12'], lab: 'D2', val: 'P6KE18A',
    tip: 'الشريطة لفوق ناحية +12V. لو اتعكس هيعمل قصر ويضرب الفيوز.' },
  { id: 'C1', k: 'can', s: POWER, legs: [[5, 1], [5, 3]], nets: ['V12', 'GND'], lab: 'C1', val: '100µF',
    tip: 'الرجل الطويلة (+) لفوق ناحية +12V، والشريطة (−) لتحت. المكثف الكيميائي لو اتعكس ممكن ينفجر.' },
  { id: 'C2', k: 'ceramic', s: POWER, legs: [[7, 1], [7, 3]], nets: ['V12', 'GND'], lab: 'C2', val: '100nF',
    tip: 'المكثف الصغير المكتوب عليه 104. ملوش اتجاه.' },
  { id: 'U2', k: 'to220', s: POWER, legs: [[10, 2], [10, 3], [10, 4]], nets: ['V12', 'GND', 'V5'], lab: 'U2', val: '7805', face: 'left', labelAt: [0, 2.3],
    tip: 'الكتابة ناحية الشمال والضهر المعدن ناحية اليمين. الرجل اللي فوق IN، واللي في النص GND، واللي تحت OUT (5V).' },
  { id: 'C3', k: 'ceramic', s: POWER, legs: [[11, 4], [11, 3]], nets: ['V5', 'GND'], lab: 'C3', val: '100nF',
    tip: 'لازق في ضهر الـ 7805. ملوش اتجاه.' },
  { id: 'C7', k: 'ceramic', s: POWER, legs: [[12, 5], [13, 5]], nets: ['V5', 'GND'], lab: 'C7', val: '100nF',
    tip: 'فوق رجل 14 و13 بتوع القاعدة على طول. ده بيهدّي كهربا الـ IC. ملوش اتجاه.' },

  ...oscillator(1, 12, 'R1', 1e6, 'C4'),
  ...oscillator(2, 14, 'R2', 390e3, 'C5'),
  ...oscillator(3, 16, 'R3', 100e3, 'C6'),

  mixer('R4', 13, '10kΩ', 10e3, 'P2', 'R1'),
  mixer('R5', 15, '22kΩ', 22e3, 'P4', 'R2'),
  mixer('R6', 17, '47kΩ', 47e3, 'P6', 'R3'),
  { id: 'R7', k: 'res', s: MIX, legs: [[10, 12], [10, 16]], nets: ['V5', 'N'], lab: 'R7', val: '10kΩ', ohm: 10e3,
    tip: 'نايمة بالطول على الشمال. فوق على خط 5V، وتحت على خط N.' },
  { id: 'C8', k: 'can', s: MIX, legs: [[20, 17], [20, 18]], nets: ['N', 'GND'], lab: 'C8', val: '22µF',
    tip: 'الرجل الطويلة (+) على خط N، والشريطة (−) لتحت ناحية الأرضي.' },

  { id: 'Q1', k: 'to220', s: DRIVE, legs: [[22, 14], [23, 14], [24, 14]], nets: ['N', 'C', 'E'], lab: 'Q1', val: 'TIP122', face: 'down',
    tip: 'الكتابة لتحت (ناحيتك) والضهر المعدن لفوق. من الشمال: B ثم C ثم E. الضهر المعدن متوصل بالـ C، فماينفعش يلمس أي معدن.' },
  { id: 'R8', k: 'res', s: DRIVE, legs: [[25, 14], [25, 18]], nets: ['E', 'GND'], labelAt: [0, 2.75], lab: 'R8', val: '68Ω', ohm: 68,
    tip: 'لو معاكش 68Ω: حط 100Ω هنا وفي R9 وR10 (يعني 3 × 100Ω).' },
  { id: 'R9', k: 'res', s: DRIVE, legs: [[26, 14], [26, 18]], nets: ['E', 'GND'], labelAt: [0, 2.75], lab: 'R9', val: '68Ω', ohm: 68,
    tip: 'زي R8 بالظبط وجنبها. الاتنين مع بعض = 34Ω.' },
  { id: 'R10', k: 'res', s: DRIVE, legs: [[27, 14], [27, 18]], nets: ['E', 'GND'], labelAt: [0, 2.75], lab: 'R10', val: 'اختياري', ohm: 100, optional: true,
    tip: 'مكان احتياطي. سيبه فاضي لو مركّب 2 × 68Ω. استخدمه لو بتركّب 3 × 100Ω، أو 3 × 68Ω عشان لمبتين (يمين وشمال).' },
  { id: 'R11', k: 'res', s: DRIVE, legs: [[28, 14], [28, 18]], nets: ['E', 'GND'], labelAt: [0, 2.75], lab: 'R11', val: 'اختياري', ohm: 100, optional: true,
    tip: 'مكان احتياطي تاني. استخدمه بس للمبتين لو معاك 100Ω بس: R8 وR9 وR10 وR11 = 4 × 100Ω.' },
  { id: 'YELLOW', k: 'pad', s: DRIVE, legs: [[29, 0]], nets: ['V12'], lab: 'LAMP+', val: 'سلك أصفر', color: '#f5c518',
    tip: 'رايح لموجب فيشة اللمبة.' },
  { id: 'BLUE', k: 'pad', s: DRIVE, legs: [[29, 11]], nets: ['C'], lab: 'LAMP−', val: 'سلك أزرق', color: '#3b82f6',
    tip: 'رايح لسالب فيشة اللمبة. ده الطرف اللي الترانزستور بيتحكم فيه.' }
]

const t = (net: string, s: number, ...pts: [number, number][]): PerfTrace => ({ net, s, pts })

export const perfTraces: PerfTrace[] = [
  t('V12', POWER, [0, 0], [11, 0]),
  t('V12', POWER, [5, 0], [5, 1]),
  t('V12', POWER, [7, 0], [7, 1]),
  t('V12', POWER, [10, 0], [10, 2]),
  t('IN', POWER, [0, 4], [1, 4]),
  t('GND', POWER, [3, 3], [19, 3]),
  t('GND', POWER, [3, 3], [3, 19]),
  t('GND', POWER, [0, 19], [3, 19]),
  t('GND', POWER, [13, 3], [13, 6]),
  t('GND', POWER, [15, 3], [15, 6]),
  t('GND', POWER, [17, 3], [17, 6]),
  t('GND', POWER, [19, 3], [19, 9], [18, 9]),
  t('V5', POWER, [10, 4], [12, 4], [12, 6]),

  t('GND', OSC, [3, 19], [16, 19]),
  t('P1', OSC, [12, 9], [12, 16]),
  t('P2', OSC, [13, 9], [13, 10]),
  t('P3', OSC, [14, 9], [14, 16]),
  t('P4', OSC, [15, 9], [15, 10]),
  t('P5', OSC, [16, 9], [16, 16]),
  t('P6', OSC, [17, 9], [17, 10]),
  t('GND', OSC, [12, 18], [12, 19]),
  t('GND', OSC, [14, 18], [14, 19]),
  t('GND', OSC, [16, 18], [16, 19]),

  t('P2', MIX, [13, 10], [13, 11]),
  t('P4', MIX, [15, 10], [15, 11]),
  t('P6', MIX, [17, 10], [17, 11]),
  t('V5', MIX, [10, 4], [10, 12]),
  t('N', MIX, [10, 16], [10, 17], [20, 17]),
  t('N', MIX, [13, 15], [13, 17]),
  t('N', MIX, [15, 15], [15, 17]),
  t('N', MIX, [17, 15], [17, 17]),
  t('GND', MIX, [16, 19], [20, 19]),
  t('GND', MIX, [20, 18], [20, 19]),

  t('V12', DRIVE, [11, 0], [29, 0]),
  t('N', DRIVE, [20, 17], [22, 17], [22, 14]),
  t('C', DRIVE, [23, 14], [23, 11], [29, 11]),
  t('E', DRIVE, [24, 14], [28, 14]),
  t('GND', DRIVE, [20, 19], [28, 19]),
  t('GND', DRIVE, [25, 18], [25, 19]),
  t('GND', DRIVE, [26, 18], [26, 19]),
  t('GND', DRIVE, [27, 18], [27, 19]),
  t('GND', DRIVE, [28, 18], [28, 19])
]

export const perfLayout: PerfLayout = {
  cols: 30,
  rows: 20,
  parts: perfParts,
  traces: perfTraces,
  nets: {
    IN: { n: 'داخل من الفيوز (قبل D1)', c: '#e5484d' },
    V12: { n: '+12V', c: '#ff8a00' },
    GND: { n: 'الأرضي (GND)', c: '#8a94a8' },
    V5: { n: '+5V', c: '#ff5d5d' },
    P1: { n: 'رجل 1 (دخول مذبذب 1)', c: '#5aa9ff' },
    P2: { n: 'رجل 2 (خروج مذبذب 1)', c: '#3ddc97' },
    P3: { n: 'رجل 3 (دخول مذبذب 2)', c: '#5aa9ff' },
    P4: { n: 'رجل 4 (خروج مذبذب 2)', c: '#3ddc97' },
    P5: { n: 'رجل 5 (دخول مذبذب 3)', c: '#5aa9ff' },
    P6: { n: 'رجل 6 (خروج مذبذب 3)', c: '#3ddc97' },
    N: { n: 'النقطة N (الخلط)', c: '#b58cff' },
    E: { n: 'الإميتر E', c: '#ffd24d' },
    C: { n: 'الكولكتور C (سالب اللمبة)', c: '#4cc9f0' }
  }
}

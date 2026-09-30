import type { BoardPart, Html } from '../types/circuit'

export interface LessonHighlight {
  strip: string
  color: string
}

export interface LessonStep {
  title: string
  body: Html
  highlights: LessonHighlight[]
  marks: string[]
  demo: BoardPart[]
}

const BLUE = '#3b82f6'
const ORANGE = '#f97316'
const RED = '#ef4444'
const GREEN = '#22c55e'
const VIOLET = '#a855f7'

const column = (half: 'T' | 'B', col: number) => (half === 'T' ? 'abcde' : 'fghij').split('').map(r => r + col)

const chipColumns = [26, 27, 28, 29, 30, 31, 32]
const chipPins: BoardPart['pins'] = [
  ...chipColumns.map((c): [string, string] => ['f' + c, 'P' + (c - 25)]),
  ...[...chipColumns].reverse().map((c): [string, string] => ['e' + c, 'P' + (40 - c)])
]
const chipColors = [BLUE, ORANGE, GREEN, VIOLET, RED, '#14b8a6', '#eab308']

export const lessonSteps: LessonStep[] = [
  {
    title: '1. كل خرم ليه اسم: حرف ورقم',
    body: 'الحرف هو <b>الصف</b> (من a لـ j)، والرقم هو <b>العمود</b> (من 1 لـ 63). يعني الخرم المتعلّم ده اسمه <code>c12</code>: صف c، عمود 12. كل الأدلة بتكلمك بالأسماء دي.',
    highlights: [],
    marks: ['c12'],
    demo: []
  },
  {
    title: '2. كل 5 خرم في عمود واحد متوصلين ببعض',
    body: 'تحت الخرم <b>a12 وb12 وc12 وd12 وe12</b> فيه شريحة معدن واحدة بتوصلهم. فأي رجلين أو سلكين تحطهم في نفس العمود (في نفس النص) = <b>متوصلين ببعض</b>، من غير لحام.',
    highlights: [{ strip: 'T12', color: BLUE }],
    marks: column('T', 12),
    demo: []
  },
  {
    title: '3. المجرى اللي في النص بيفصل النصين',
    body: 'النص اللي فوق (a–e) <b>مش متوصل</b> بالنص اللي تحت (f–j)، حتى لو نفس رقم العمود. يعني <code>e12</code> و<code>f12</code> مش متوصلين: كل واحد منهم في شريحة لوحده.',
    highlights: [{ strip: 'T12', color: BLUE }, { strip: 'B12', color: ORANGE }],
    marks: ['e12', 'f12'],
    demo: []
  },
  {
    title: '4. خطوط الباور: كل خط متوصل على طول البورد',
    body: 'الخطين اللي فوق واللي تحت متوصلين <b>بالطول</b> مش بالعرض. بنستخدم الأحمر (+) للموجب، والأزرق (−) للسالب أو الأرضي، عشان أي قطعة تاخد كهربا من أقرب خرم. ⚠️ في بعض البوردات الخط بيتقطع في النص، فقيسه بالملتيميتر الأول.',
    highlights: [{ strip: 'tp', color: RED }, { strip: 'tn', color: BLUE }, { strip: 'bn', color: BLUE }, { strip: 'bp', color: RED }],
    marks: [],
    demo: []
  },
  {
    title: '5. إزاي تركّب مقاومة صح',
    body: 'كل رجل في <b>عمود مختلف</b>: هنا رجل في العمود 12 ورجل في العمود 16. كده الكهربا عشان تروح من العمود 12 للعمود 16 لازم تعدّي <b>من جوه المقاومة</b>، وده اللي احنا عايزينه.',
    highlights: [{ strip: 'T12', color: BLUE }, { strip: 'T16', color: ORANGE }],
    marks: [],
    demo: [{ id: 'R', k: 'res', s: 0, ohm: 10e3, pins: [['c12', 'A'], ['c16', 'B']] }]
  },
  {
    title: '6. غلطة مشهورة: الرجلين في نفس العمود',
    body: 'المقاومة هنا رجليها الاتنين في <b>العمود 20</b>. العمود نفسه بيوصل الرجلين ببعض، فالكهربا بتعدّي من الشريحة المعدن وتسيب المقاومة، كأنها <b>مش موجودة</b>. نفس الكلام لأي قطعة: متحطش رجلينها في نفس العمود.',
    highlights: [{ strip: 'T20', color: RED }],
    marks: [],
    demo: [{ id: 'R', k: 'res', s: 0, ohm: 10e3, pins: [['a20', 'A'], ['e20', 'A']] }]
  },
  {
    title: '7. ليه الشريحة (IC) بتركب على المجرى',
    body: 'لما الشريحة تركب <b>فوق المجرى</b>، كل رجل من رجولها الـ 14 بتقع في عمود لوحدها، فمفيش رجلين متوصلين ببعض بالغلط، وكل رجل ليها 4 خرم فاضيين توصّل فيهم. لو ركبتها في نص واحد، كل رجلين قصاد بعض هيبقوا متوصلين.',
    highlights: chipColumns.flatMap((c, i) => [{ strip: 'T' + c, color: chipColors[i] }, { strip: 'B' + c, color: chipColors[i] }]),
    marks: [],
    demo: [{ id: 'IC', k: 'dip', s: 0, lbl: 'DIP-14', pins: chipPins }]
  },
  {
    title: '8. جرّب بنفسك',
    body: 'دوس على <b>أي خرم</b> في البورد، وهيتنوّر هو وكل الخرم المتوصلين بيه، وهيتكتب تحت أساميهم. جرّب خرم في النص اللي فوق، وخرم في اللي تحت، وخرم في خط الباور، وشوف الفرق.',
    highlights: [],
    marks: [],
    demo: []
  }
]

export const lessonMeta = {
  title: 'البريد بورد الفاضي: بيتوصل إزاي من جوه؟',
  tag: 'درس · 3 دقايق',
  icon: '🧩',
  summary: 'قبل أي دايرة: اعرف الخرم متوصلة ببعض إزاي، وليه الشريحة بتركب على المجرى، وإيه أشهر غلطة بيعملها المبتدئين.',
  level: 'مبتدئ خالص · مفيش أي معلومات مطلوبة'
}

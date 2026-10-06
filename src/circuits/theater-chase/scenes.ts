import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, label, padAt, piece, scene, strip, wire, type Pt } from '../../lib/scene/draw'

const LEN = 120
const GAP = 22
const Y = 150
const X0 = 50
const pieceX = (i: number) => X0 + i * (LEN + GAP)
const PHASE = ['A', 'B', 'C', 'A']
const PHASE_COLOR: Record<string, string> = { A: '#a78bfa', B: '#34d399', C: '#fbbf24' }

const plusPad = (i: number): Pt => padAt(pieceX(i), Y, 0, LEN, 'start', '+')
const minusPad = (i: number): Pt => padAt(pieceX(i), Y, 0, LEN, 'start', '-')

const pieces = (lit: boolean[] = [false, false, false, false]) =>
  lit.map((on, i) => piece(pieceX(i), Y, 0, { len: LEN, lit: on }) + label(pieceX(i) + LEN / 2, Y - 34, 'حتة ' + (i + 1), { size: 14 })).join('')

const plusChain = () => wire([[plusPad(0)[0], 70], plusPad(0)], '#f5c518', 3) +
  [1, 2, 3].map(i => wire([[plusPad(i - 1)[0], 70], [plusPad(i)[0], 70], plusPad(i)], '#f5c518', 3)).join('') +
  label(plusPad(0)[0] - 8, 66, 'STRIP+', { size: 13, color: '#f5c518', anchor: 'end' })

const minusLeads = () => PHASE.map((p, i) => wire([minusPad(i), [minusPad(i)[0], 250 + (i === 3 ? 0 : 0)], [minusPad(i)[0] + 8, 270]], PHASE_COLOR[p], 3) +
  label(minusPad(i)[0] + 10, 292, p, { size: 16, color: PHASE_COLOR[p], weight: 900 })).join('') +
  wire([[minusPad(0)[0] + 8, 270], [minusPad(0)[0] + 8, 310], [minusPad(3)[0] + 8, 310], [minusPad(3)[0] + 8, 270]], PHASE_COLOR.A, 3)

export const cutScene: SceneFrame[] = [
  {
    say: 'جرّب الشريط الـ 20 سم على الأدابتر الأول: <b>+</b> على نقطة +12V و<b>−</b> على −. الـ 12 لمبة ينوّروا.',
    svg: scene(strip(X0 + 60, Y + 30, 4, { len: LEN, lit: true }), adapter(10, 30, padAt(X0 + 60, Y + 30, 0, LEN, 'start', '+'), padAt(X0 + 60, Y + 30, 0, LEN, 'start', '-'))),
    spots: [{ x: 300, y: 260, t: '20 سم = 12 لمبة', d: 'في شريط 60 لمبة/متر: كل 5 سم 3 لمبات، فالـ 20 سم = <b>4 حتت</b> بالظبط.' }]
  },
  {
    say: 'قص الشريط عند <b>علامات المقص</b> التلاتة: هيطلع <b>4 حتت</b>، كل حتة 3 لمبات. قص في نص النحاس بالظبط.',
    svg: scene(strip(X0 + 60, Y, 4, { len: LEN, pulseMarks: true })),
    spots: [{ x: 300, y: 260, t: 'ليه نقطّعه؟', d: 'الشريط العادي كل لمباته على نفس السلكين، فلو فضل حتة واحدة كله هينوّر مع بعض. لما نقطّعه، كل حتة نقدر نولّعها لوحدها.' }]
  },
  {
    say: 'دول الـ <b>4 حتت</b>. رقّمهم بقلم من 1 لـ 4 على ضهرهم عشان متتلخبطش.',
    svg: pieces(),
    spots: [{ x: pieceX(3) + LEN / 2, y: 230, t: 'حتة 4 زي حتة 1', d: 'حتة 1 وحتة 4 هيتوصلوا مع بعض على نفس الخرج (A). ده اللي بيخلّي النور يلف من آخر الشريط لأوله.' }]
  }
]

export const wireScene: SceneFrame[] = [
  {
    say: 'الـ <b>+</b> بتاع الأربع حتت كلهم مع بعض: سلكة <b>صفرا</b> من + كل حتة لـ + اللي بعدها، وأولها رايح لـ <b>STRIP+</b> في البورد.',
    svg: scene(pieces(), plusChain()),
    spots: [{ x: 300, y: 50, t: 'الـ + مشترك', d: 'الـ 4 حتت دايماً عليهم +12V. اللي بيولّع أو يطفّي كل حتة هو السالب بتاعها، عن طريق الترانزستور.' }]
  },
  {
    say: 'الـ <b>−</b> بتاع كل حتة سلكة لوحدها: حتة 1 وحتة 4 <b>مع بعض</b> على <b>A</b>، وحتة 2 على <b>B</b>، وحتة 3 على <b>C</b>.',
    svg: scene(pieces(), plusChain(), minusLeads()),
    spots: [
      { x: minusPad(0)[0] + 70, y: 325, t: 'حتة 1 و4 على A', d: 'السلكتين البنفسجي بيتقابلوا في سلكة واحدة رايحة لـ سلك <b>A</b> في البورد.' },
      { x: minusPad(1)[0] + 40, y: 250, t: 'B وC', d: 'حتة 2 على سلك <b>B</b>، وحتة 3 على سلك <b>C</b>. كل سلكة لون مختلف عشان متتلخبطش.' }
    ]
  }
]

const box = (x: number, y: number, w: number, title: string, sub: string, color: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="70" rx="10" fill="#141b2c" stroke="${color}" stroke-width="2"/>` +
  label(x + w / 2, y + 30, title, { size: 15, color }) + label(x + w / 2, y + 52, sub, { size: 12, color: COLORS.muted })

export const blockScene: SceneFrame[] = [
  {
    say: 'الدايرة كلها 4 بلوكات ورا بعض. دوس على الأرقام عشان تعرف كل بلوك بيعمل إيه.',
    svg: scene(
      box(10, 40, 130, '🛡️ حماية', '1N4007 · TVS · 7805', COLORS.plus),
      arrow([140, 75], [170, 75]),
      box(170, 40, 120, '⏱️ ساعة', 'CD40106 · R1 · C4', '#5aa9ff'),
      arrow([290, 75], [320, 75]),
      box(320, 40, 120, '🔢 عدّاد', 'CD4017', '#f472b6'),
      arrow([440, 75], [470, 75]),
      box(470, 40, 120, '💡 ترانزستورات', '3 × 2N2222', COLORS.amber),
      ...['A', 'B', 'C'].map((p, i) => wire([[500 + i * 30, 110], [500 + i * 30, 200]], PHASE_COLOR[p], 3) + label(500 + i * 30, 222, p, { size: 15, color: PHASE_COLOR[p] })),
      label(300, 300, 'الحتت: 1 و4 ← A · 2 ← B · 3 ← C', { size: 15 })
    ),
    spots: [
      { x: 75, y: 130, t: 'الحماية', d: 'نفس كيت الرعشة. والـ 7805 بيطلّع 5V للشريحتين لأنهم مش بيحبوا جهد العربية المتقلب.' },
      { x: 230, y: 130, t: 'الساعة', d: 'بوابة Schmitt مع R1 وC4: المكثف بيتملا ويفضى، والخرج بيقلب كل حوالي 80 ms. ده "النبض" بتاع الجري.' },
      { x: 380, y: 130, t: 'العدّاد', d: 'CD4017 فيه 10 خروج، بيولّع واحد بس كل نبضة: Q0 ثم Q1 ثم Q2… وصّلنا Q3 بالـ Reset عشان يرجع لـ Q0 بعد 3 خطوات.' },
      { x: 530, y: 260, t: 'الترانزستورات', d: 'الخرج بتاع الشريحة ضعيف (ميقدرش يشيل الشريط). كل خرج بيفتح ترانزستور، والترانزستور هو اللي بيوصّل سالب الحتة للأرضي.' }
    ]
  }
]

const chaseFrame = (lit: boolean[], say: string, n: number): SceneFrame => ({
  say,
  svg: scene(pieces(lit), label(300, 300, 'خطوة ' + n + ' من 3', { size: 16, color: COLORS.amber }))
})

export const runScene: SceneFrame[] = [
  chaseFrame([true, false, false, true], '<b>خطوة 1 (Q0 ← A):</b> حتة 1 وحتة 4 منوّرين.', 1),
  chaseFrame([false, true, false, false], '<b>خطوة 2 (Q1 ← B):</b> حتة 2 بس. النور "اتنقل" لليمين.', 2),
  chaseFrame([false, false, true, false], '<b>خطوة 3 (Q2 ← C):</b> حتة 3 بس. وبعدها Q3 بيعمل Reset ويرجع لخطوة 1، فالنور يبان كأنه لفّ من 3 لـ 4 و1.', 3)
]

const SPEEDS: [string, string, string][] = [['47k', '≈ 38 ms', 'سريع جداً'], ['100k', '≈ 80 ms', 'المسرح (الأصلي)'], ['220k', '≈ 180 ms', 'هادي'], ['390k', '≈ 320 ms', 'بطيء']]

export const speedScene: SceneFrame[] = [
  {
    say: 'السرعة كلها من <b>R1</b>: كل خطوة ≈ 0.8 × R1 × C4. غيّر R1 بس والباقي زي ما هو.',
    svg: scene(...SPEEDS.map(([r, t, n], i) => {
      const y = 50 + i * 66
      return `<rect x="60" y="${y}" width="480" height="52" rx="10" fill="#141b2c" stroke="${i === 1 ? COLORS.amber : '#3a4666'}" stroke-width="2"/>` +
        label(120, y + 32, 'R1 = ' + r, { size: 16, color: COLORS.amber }) + label(300, y + 32, t, { size: 15 }) + label(460, y + 32, n, { size: 14, color: COLORS.muted })
    })),
    spots: [{ x: 560, y: 30, t: 'عايز تظبطها بمفك؟', d: 'حط مقاومة متغيّرة <b>500k</b> (Trimmer) ومعاها <b>22k</b> ثابتة مكان R1. كده السرعة من سريع جداً لبطيء جداً، وتظبطها وهي شغالة.' }]
  }
]

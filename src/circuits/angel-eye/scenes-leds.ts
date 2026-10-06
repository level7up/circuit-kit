import type { SceneFrame } from '../../types/circuit'
import {
  COLORS, arrow, label, led5, ledRingPoints, ledSide, resistor, ringGlyph, scene, wire, type Pt
} from '../../lib/scene/draw'

const SIZE = 1.4
const W = 22 * SIZE
const H = 30 * SIZE
const ROW_Y = 120
const ROW_X = [250, 340, 430]
const longLeg = (x: number): Pt => [x + W * 0.22, ROW_Y + H * 2.5]
const shortLeg = (x: number): Pt => [x - W * 0.22, ROW_Y + H * 1.9]

const ADAPTER = { x: 30, y: 250 }

function groupSide(lit: boolean, powered: boolean): string {
  const leds = ROW_X.map(x => ledSide(x, ROW_Y, lit, SIZE)).join('')
  const chain = ROW_X.slice(0, 2).map((x, i) => wire([shortLeg(x), longLeg(ROW_X[i + 1])], '#9aa6bd', 2.5)).join('')
  const first = longLeg(ROW_X[0])
  const last = shortLeg(ROW_X[2])
  const res = resistor(150, first[1], first[0], first[1])
  const supply = powered
    ? `<rect x="${ADAPTER.x}" y="${ADAPTER.y}" width="96" height="64" rx="10" fill="#1d2230" stroke="#4a5263" stroke-width="2"/>` +
      label(ADAPTER.x + 48, ADAPTER.y + 28, 'أدابتر', { size: 13 }) + label(ADAPTER.x + 48, ADAPTER.y + 48, '12V', { size: 13, color: COLORS.amber }) +
      wire([[ADAPTER.x + 70, ADAPTER.y], [ADAPTER.x + 70, first[1]], [150, first[1]]], COLORS.plus, 3) +
      wire([[ADAPTER.x + 96, ADAPTER.y + 44], [last[0] + 60, ADAPTER.y + 44], [last[0] + 60, last[1]], last], '#2b2b2b', 3)
    : ''
  const signs = ROW_X.map(x => label(longLeg(x)[0] + 9, longLeg(x)[1] + 4, '+', { size: 14, color: COLORS.plus, anchor: 'start' }) +
    label(shortLeg(x)[0] - 8, shortLeg(x)[1] + 4, '−', { size: 14, color: COLORS.minus, anchor: 'end' })).join('')
  return leds + chain + res + signs + supply
}

export const ledTestScene: SceneFrame[] = [
  {
    say: 'كل LED 5mm ليها رجلين: <b>الطويلة = +</b> و<b>القصيرة = −</b>. هنوصّل <b>3 لمبات ورا بعض</b> (سلسلة) ومعاهم مقاومة <b>220Ω</b>.',
    svg: groupSide(false, false),
    spots: [
      { x: longLeg(ROW_X[0])[0] + 26, y: longLeg(ROW_X[0])[1] - 10, t: 'الرجل الطويلة = +', d: 'دي اللي بتروح ناحية الـ 12V. ولو الرجلين اتقصوا، بص جوه اللمبة: الحتة الصغيرة هي الـ +، والجنب المشطوف في الحرف تحت هو الـ −.' },
      { x: 395, y: 290, t: 'السلسلة', d: 'القصيرة (−) بتاعة اللمبة الأولى في الطويلة (+) بتاعة التانية، وهكذا. التلاتة مع بعض بياكلوا حوالي 9V من الـ 12V.' },
      { x: 166, y: 196, t: 'المقاومة 220Ω', d: 'ألوانها <b>أحمر أحمر بني</b>. بتاكل الفولتات الباقية وبتخلي التيار حوالي 19mA. من غيرها اللمبات تتحرق في ثانية.' }
    ]
  },
  {
    say: 'جرّب المجموعة دي على الأدابتر <b>قبل</b> ما تعمل الباقي: التلاتة لازم ينوّروا مع بعض.',
    svg: groupSide(true, true),
    spots: [{ x: 500, y: 90, t: 'لو مانوّرتش', d: 'لمبة واحدة مقلوبة بتطفّي التلاتة. اقلب اللمبات واحدة واحدة لحد ما ينوّروا.' }]
  }
]

const C: Pt = [300, 172]
const R = 110
const COUNT = 18
const ring = (fill: string, width: number) => `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="none" stroke="${fill}" stroke-width="${width}"/>`
const lid = () => ring('#7d8696', 40)
const points = ledRingPoints(C[0], C[1], R, COUNT)

export const ledMarkScene: SceneFrame[] = [
  {
    say: 'اقطع <b>حلقة من غطا علبة</b> زي طريقة الشريط (قطر 12 سم من برّه و8 سم من جوه)، وعلّم عليها <b>18 نقطة</b> على مسافات متساوية في نص الحلقة.',
    svg: scene(lid(), ...points.map(p => `<circle cx="${p.led[0]}" cy="${p.led[1]}" r="4.5" fill="${COLORS.bad}"/>`), label(C[0], C[1] + 5, 'نقطة كل 1.75 سم', { size: 13, color: COLORS.amber })),
    spots: [{ x: C[0] + R + 46, y: C[1], t: 'ليه 18؟', d: '18 لمبة = 6 مجموعات × 3. على حلقة قطرها 10 سم بيبقى بين كل لمبة واللي بعدها حوالي 1.75 سم. لو عايزها أنعم: 24 لمبة (8 مجموعات).' }]
  },
  {
    say: '<b>الطريقة السهلة للـ 18 نقطة:</b> لف شريط ورق حوالين الحلقة وعلّم طوله. اطويه <b>نصين</b>، وبعدين <b>3</b>، وبعدين <b>3</b> كمان: هيطلع 18 حتة متساويين.',
    svg: scene(
      `<rect x="40" y="140" width="520" height="44" fill="#f2efe6" stroke="#bdb6a0"/>`,
      ...Array.from({ length: 17 }, (_, i) => {
        const x = 40 + (520 * (i + 1)) / 18
        const strong = (i + 1) % 9 === 0
        return `<line x1="${x}" y1="${strong ? 128 : 140}" x2="${x}" y2="${strong ? 196 : 184}" stroke="${strong ? COLORS.bad : '#8a7a5a'}" stroke-width="${strong ? 3 : 1.5}" stroke-dasharray="${strong ? '' : '4 3'}"/>`
      }),
      label(300, 118, 'نصين ← 3 ← 3 = 18', { color: COLORS.amber }),
      label(300, 230, 'كل حتة = مكان لمبة', { size: 13 })
    ),
    spots: [{ x: 300, y: 270, t: 'من غير مسطرة ولا منقلة', d: 'الطي بيقسم بالظبط. حط الشريط تاني حوالين الحلقة وانقل العلامات بالقلم.' }]
  }
]

const NAIL = '<line x1="470" y1="40" x2="' + (points[2].led[0] + 4) + '" y2="' + (points[2].led[1] - 4) + '" stroke="#9aa6bd" stroke-width="6" stroke-linecap="round"/><rect x="455" y="20" width="60" height="26" rx="6" fill="#5a3b1e" transform="rotate(-30 485 33)"/>'

export const ledHoleScene: SceneFrame[] = [
  {
    say: 'اخرم كل نقطة بـ <b>مسمار سخن</b> (امسكه بزرادية وسخّنه على البوتاجاز) أو بنطة 5 مم. الخرم لازم يبقى على مقاس اللمبة بالظبط.',
    svg: scene(lid(), ...points.map((p, i) => `<circle cx="${p.led[0]}" cy="${p.led[1]}" r="${i < 3 ? 5 : 3.5}" fill="${i < 3 ? '#0b0f17' : COLORS.bad}"/>`), NAIL),
    spots: [{ x: 520, y: 90, t: 'أمان', d: 'امسك المسمار بزرادية مش بإيدك، واشتغل في مكان فيه هوا لأن البلاستيك السايح ليه ريحة. ونضّف الحرف بالكاتر بعد ما يبرد.' }]
  },
  {
    say: 'دخّل اللمبات من <b>قدام</b> في كل الخروم، و<b>كل الرجول الطويلة (+) ناحية برّه الحلقة</b>. ثبّت كل لمبة بنقطة شمع من ورا.',
    svg: scene(lid(), ...points.map(p => led5(p.led[0], p.led[1]))),
    spots: [{ x: C[0], y: C[1], t: 'ليه كلهم برّه؟', d: 'عشان تعرف الـ + من الـ − من ورا وانت بتلحم من غير ما تتلخبط: كل حاجة برّه = +، وكل حاجة جوه = −.' }]
  },
  {
    say: '<b>من الجنب:</b> اللمبة طالعة من قدام، والرجلين من ورا الغطا. الطويلة برّه والقصيرة جوه.',
    svg: scene(
      `<rect x="100" y="150" width="400" height="16" fill="#7d8696"/>`, label(520, 163, 'الغطا', { size: 13, anchor: 'start' }),
      `<rect x="${300 - W / 2 - 2}" y="150" width="${W + 4}" height="16" fill="#0d1320"/>`,
      `<g transform="translate(0 -40)">${ledSide(300, 160, false, SIZE)}</g>`,
      `<ellipse cx="300" cy="172" rx="30" ry="9" fill="#f2d98a" opacity=".85"/>`,
      label(300, 70, 'قدام ← النور', { size: 13 }), label(340, 225, 'برّه (+)', { size: 13, color: COLORS.plus, anchor: 'start' }), label(260, 200, 'جوه (−)', { size: 13, color: COLORS.minus, anchor: 'end' })
    ),
    spots: [{ x: 400, y: 190, t: 'نقطة الشمع', d: 'بتمسك اللمبة في مكانها وانت بتلحم. بعد ما تخلص وتجرّب، غطّي كل حاجة بسيليكون للعربية.' }]
  }
]

const groupOf = (i: number) => Math.floor(i / 3)
const BUS_PLUS = R + 42
const BUS_MINUS = R - 42

function backView(opts: { zoomGroup?: boolean; lit?: boolean } = {}): string {
  const chains = points.map((p, i) => {
    if (i % 3 === 2) return ''
    return wire([p.minus, points[i + 1].plus], '#9aa6bd', 2)
  }).join('')
  const resistors = points.filter((_, i) => i % 3 === 0).map(p => {
    const a = Math.atan2(p.plus[1] - C[1], p.plus[0] - C[0])
    return resistor(p.plus[0], p.plus[1], C[0] + BUS_PLUS * Math.cos(a), C[1] + BUS_PLUS * Math.sin(a))
  }).join('')
  const returns = points.filter((_, i) => i % 3 === 2).map(p => {
    const a = Math.atan2(p.minus[1] - C[1], p.minus[0] - C[0])
    return wire([p.minus, [C[0] + BUS_MINUS * Math.cos(a), C[1] + BUS_MINUS * Math.sin(a)]], COLORS.blue, 2)
  }).join('')
  const buses = `<circle cx="${C[0]}" cy="${C[1]}" r="${BUS_PLUS}" fill="none" stroke="${COLORS.orange}" stroke-width="3"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${BUS_MINUS}" fill="none" stroke="${COLORS.blue}" stroke-width="3"/>`
  const leds = points.map((p, i) => led5(p.led[0], p.led[1], opts.lit, 7) +
    `<circle cx="${p.plus[0]}" cy="${p.plus[1]}" r="2.5" fill="${COLORS.plus}"/><circle cx="${p.minus[0]}" cy="${p.minus[1]}" r="2.5" fill="${COLORS.minus}"/>` +
    (opts.zoomGroup && groupOf(i) !== 0 ? `<circle cx="${p.led[0]}" cy="${p.led[1]}" r="12" fill="#0d1320" opacity=".65"/>` : '')).join('')
  return scene(lid(), buses, resistors, returns, chains, leds)
}

const G = { x: [160, 300, 440], plusY: 130, ledY: 170, minusY: 210 }

export const ledGroupScene: SceneFrame[] = [
  {
    say: '<b>مجموعة واحدة من ورا بالتكبير:</b> − اللمبة 1 (جوه) في + اللمبة 2 (برّه)، و− اللمبة 2 في + اللمبة 3. ومقاومة 220Ω على + اللمبة 1.',
    svg: scene(
      `<rect x="60" y="${G.plusY - 24}" width="480" height="${G.minusY - G.plusY + 48}" rx="10" fill="#7d8696"/>`,
      ...G.x.map(x => led5(x, G.ledY, false, 16) +
        `<circle cx="${x}" cy="${G.plusY}" r="5" fill="${COLORS.plus}"/><circle cx="${x}" cy="${G.minusY}" r="5" fill="${COLORS.minus}"/>`),
      wire([[G.x[0], G.minusY], [G.x[1], G.plusY]], '#9aa6bd', 3),
      wire([[G.x[1], G.minusY], [G.x[2], G.plusY]], '#9aa6bd', 3),
      resistor(G.x[0], G.plusY, G.x[0], 40),
      wire([[G.x[2], G.minusY], [G.x[2], 300]], COLORS.blue, 3),
      label(G.x[0] - 26, 70, '220Ω', { size: 14, anchor: 'end', color: COLORS.amber }),
      label(G.x[0], 30, '← لخط + (برتقالي)', { size: 13, anchor: 'start', color: COLORS.orange }),
      label(G.x[2] + 12, 300, 'لخط − (أزرق) ←', { size: 13, anchor: 'start', color: COLORS.minus }),
      ...G.x.map((x, i) => label(x, G.ledY + 6, String(i + 1), { size: 14, color: '#1b2333', weight: 900 })),
      label(560, G.plusY + 5, 'برّه +', { size: 12, color: COLORS.plus, anchor: 'end' }), label(560, G.minusY + 5, 'جوه −', { size: 12, color: COLORS.minus, anchor: 'end' })
    ),
    spots: [
      { x: 230, y: 150, t: 'سلكة مايلة', d: 'كل سلكة بتنزل من − لمبة (جوه) لـ + اللمبة اللي بعدها (برّه). ممكن كمان تثني الرجول نفسها على بعض من غير سلك.' },
      { x: 110, y: 90, t: 'المقاومة على أول لمبة', d: 'رجل في + اللمبة 1، والرجل التانية في خط الـ + البرتقالي اللي برّه الحلقة.' },
      { x: 490, y: 260, t: 'آخر لمبة للأرضي', d: '− اللمبة 3 بس هي اللي بتروح لخط الـ − الأزرق اللي جوه.' }
    ]
  },
  {
    say: 'اعمل نفس الحكاية <b>6 مرات</b> حوالين الحلقة. المجموعة الأولى منوّرة في الرسمة، والباقي زيها بالظبط.',
    svg: backView({ zoomGroup: true }),
    spots: [{ x: C[0], y: C[1], t: 'كل مجموعة لوحدها', d: 'كل 3 لمبات معاهم مقاومة واحدة. متوصّلش آخر مجموعة بأول اللي بعدها: كل مجموعة بتبدأ من الخط البرتقالي وتخلص عند الأزرق.' }]
  }
]

export const ledBusScene: SceneFrame[] = [
  {
    say: '<b>خطين حوالين الحلقة من ورا:</b> سلكة عريانة <b>برّه</b> (+، برتقالي) فيها رجول المقاومات الـ 6، وسلكة <b>جوه</b> (−، أزرق) فيها آخر لمبة من كل مجموعة.',
    svg: backView(),
    spots: [
      { x: C[0] + BUS_PLUS + 20, y: C[1] - 40, t: 'الخط البرتقالي (+)', d: 'سلكة نحاس عريانة (من كابل كهربا قديم) ملفوفة دايرة برّه الحلقة. الـ 6 مقاومات ملحومين فيها.' },
      { x: C[0], y: C[1], t: 'الخط الأزرق (−)', d: 'دايرة أصغر جوه. آخر لمبة في كل مجموعة ملحومة فيها. الخطين <b>مايلمسوش بعض</b> أبداً.' }
    ]
  },
  {
    say: 'وصّل الأدابتر: + على الخط البرتقالي و− على الأزرق. <b>الـ 18 لمبة</b> ينوّروا مع بعض.',
    svg: scene(lid(), ...points.map(p => led5(p.led[0], p.led[1], true))),
    spots: [{ x: C[0] + R + 40, y: C[1], t: 'لو 3 لمبات مطفيين', d: 'مجموعة واحدة فيها لمبة مقلوبة أو سلكة مقطوعة. المجموعات التانية مش بتتأثر: ده ميزة الطريقة دي.' }]
  }
]

export const ledFinishScene: SceneFrame[] = [
  {
    say: 'من غير ناشر هتشوف <b>18 نقطة</b>. حط حلقة <b>جركن اللبن</b> قدامهم على 5–8 مم زي طريقة الشريط، وهيبانوا <b>خط واحد</b>.',
    svg: scene(
      `<circle cx="165" cy="172" r="92" fill="none" stroke="#7d8696" stroke-width="34"/>`,
      ...ledRingPoints(165, 172, 92, COUNT).map(p => led5(p.led[0], p.led[1], true, 7)),
      ringGlyph(435, 172, 92), label(165, 310, 'من غير ناشر'), label(435, 310, 'بالناشر')
    )
  },
  {
    say: 'آخر حاجة: سلك الشاحن القديم. <b>الأحمر</b> على الخط البرتقالي (+)، و<b>الأسود</b> على الأزرق (−). وسيليكون على كل اللحامات.',
    svg: scene(backView(), wire([[20, 330], [120, 330]], '#2b2b2b', 12),
      wire([[120, 326], [C[0] - BUS_PLUS * 0.7, 326], [C[0] - BUS_PLUS * 0.7, C[1] + BUS_PLUS * 0.71]], COLORS.plus, 3),
      wire([[120, 334], [C[0] - BUS_MINUS * 0.2, 334], [C[0] - BUS_MINUS * 0.2, C[1] + BUS_MINUS * 0.98]], '#2b2b2b', 3),
      arrow([60, 300], [100, 320], COLORS.muted), label(60, 292, 'سلك شاحن', { size: 13 })),
    spots: [{ x: 500, y: 320, t: 'وبعدين؟', d: 'نفس اللي بعد كده في طريقة الشريط بالظبط: دايرة الرعشة (أو بورد الحماية)، والتجربة، والتركيب في العربية.' }]
  }
]

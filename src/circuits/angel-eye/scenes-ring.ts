import type { SceneFrame } from '../../types/circuit'
import {
  COLORS, adapter, arrow, cross, hexRing, hexSides, hexVertices, label, meter, padAt, piece, ringGlyph, scene, strip, tick, wire, type Pt
} from '../../lib/scene/draw'

const STRIP_X = 234
const STRIP_Y = 230
const PLUS_PAD: Pt = [STRIP_X + 4.5, STRIP_Y - 7]
const MINUS_PAD: Pt = [STRIP_X + 4.5, STRIP_Y + 7]

const bareEnd = ([x, y]: Pt, color: string) =>
  wire([[x - 40, y], [x, y]], color, 4) + `<rect x="${x}" y="${y - 2}" width="12" height="4" fill="${COLORS.copper}"/>`

export const testScene: SceneFrame[] = [
  {
    say: 'اقطع الفيشة الصغيرة بتاعة أدابتر الراوتر، واقشر السلكين. حط الملتيميتر على <b>DC 20V</b> وقيس بينهم.',
    svg: scene(
      `<rect x="40" y="60" width="96" height="64" rx="10" fill="#1d2230" stroke="#4a5263" stroke-width="2"/>`,
      label(88, 88, 'أدابتر'), label(88, 108, '12V 1A', { color: COLORS.amber }),
      wire([[136, 86], [220, 86], [220, 150], [270, 150]], COLORS.plus, 4), wire([[136, 100], [206, 100], [206, 186], [270, 186]], '#2b2b2b', 4),
      bareEnd([300, 150], COLORS.plus), bareEnd([300, 186], '#2b2b2b'),
      label(240, 60, '✂ الفيشة اتقصت', { size: 13, color: COLORS.amber }),
      meter(430, 40, '12.3V', [312, 150], [312, 186])
    ),
    spots: [
      { x: 88, y: 145, t: 'الأدابتر', d: 'أي أدابتر مكتوب عليه <b>12V</b> و<b>1A</b> أو أكتر: راوتر، ريسيفر، كاميرا مراقبة. الأمبير الأكبر مش مشكلة.' },
      { x: 300, y: 128, t: 'السلك اللي عليه خط', d: 'غالباً ده الـ <b>+</b>. بس متعتمدش على اللون: الملتيميتر هو اللي يحسم.' },
      { x: 465, y: 22, t: 'القراية', d: 'لو طلعت <b>12.3V</b> يبقى الأحمر على الـ +. لو طلعت <b>−12.3V</b> يبقى السلكين معكوسين: علّم على السلك التاني إنه الـ +.' }
    ]
  },
  {
    say: 'المس الـ <b>+</b> في نقطة النحاس اللي جنبها <b>+12V</b> على أول الشريط، والـ <b>−</b> في اللي تحتها. الشريط كله ينوّر.',
    svg: scene(strip(STRIP_X, STRIP_Y, 2, { lit: true }), adapter(40, 40, PLUS_PAD, MINUS_PAD), label(390, 300, 'كل اللمبات منوّرة', { color: COLORS.ok })),
    spots: [
      { x: 222, y: 196, t: 'نقطة +12V', d: 'مكتوب جنبها <b>+12V</b> أو <b>+</b>. كل 3 لمبات فيه نقطتين زيها.' },
      { x: 284, y: 268, t: 'اللمبات', d: 'كل 3 لمبات معاهم مقاومة صغيرة على الشريط نفسه، عشان كده الشريط بيشتغل على 12V على طول من غير مقاومة برّه.' }
    ]
  },
  {
    say: 'لو مانوّرش خالص: السلكين <b>معكوسين</b>. الشريط مش هيتحرق من العكس، بس مش هينوّر. اعكسهم.',
    svg: scene(strip(STRIP_X, STRIP_Y, 2), adapter(40, 40, MINUS_PAD, PLUS_PAD), cross(390, 160), label(390, 300, 'معكوس = مطفي', { color: COLORS.bad })),
    spots: [{ x: 210, y: 268, t: 'إزاي تعرف؟', d: 'لمبة الـ LED بتعدّي الكهربا في اتجاه واحد بس. لو اتعكس مفيش ضرر، اعكسه وخلاص.' }]
  }
]

const CENTER: Pt = [300, 172]
const SIDE = 100

export const drawScene: SceneFrame[] = [
  {
    say: 'هات كرتونة وكوباية أو غطا قطره قريب من <b>10 سم</b>. ارسم دايرة حواليه بالقلم.',
    svg: scene(
      `<rect x="40" y="24" width="520" height="296" rx="6" fill="#c79a5b"/>`,
      `<circle cx="${CENTER[0]}" cy="${CENTER[1]}" r="${SIDE}" fill="#e9eef5" opacity=".35" stroke="#7d8696" stroke-width="10"/>`,
      `<circle cx="${CENTER[0]}" cy="${CENTER[1]}" r="${SIDE + 5}" fill="none" stroke="#2b2b2b" stroke-width="2"/>`,
      `<line x1="430" y1="60" x2="${CENTER[0] + 80}" y2="${CENTER[1] - 66}" stroke="#2b2b2b" stroke-width="6" stroke-linecap="round"/>`,
      label(CENTER[0], CENTER[1] + 6, 'كوباية', { color: '#1b2333' })
    ),
    spots: [{ x: CENTER[0] - SIDE - 12, y: CENTER[1], t: 'ليه 10 سم؟', d: 'المسدس اللي ضلعه <b>5 سم</b> (حتة واحدة من الشريط) قطره من الركن للركن <b>10 سم</b>. لو الفانوس أصغر، اعمل 5 حتت بدل 6 (8.5 سم).' }]
  },
  {
    say: 'علّم <b>6 نقط</b> على الدايرة، المسافة بين كل نقطة واللي بعدها <b>5 سم</b> بالمسطرة. وصّلهم: ده المسدس.',
    svg: scene(
      `<rect x="40" y="24" width="520" height="296" rx="6" fill="#c79a5b"/>`,
      `<circle cx="${CENTER[0]}" cy="${CENTER[1]}" r="${SIDE}" fill="none" stroke="#2b2b2b" stroke-width="1.5" stroke-dasharray="4 4"/>`,
      `<polygon points="${hexVertices(CENTER[0], CENTER[1], SIDE).map(p => p.join(',')).join(' ')}" fill="none" stroke="#1b2333" stroke-width="3"/>`,
      hexVertices(CENTER[0], CENTER[1], SIDE).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${COLORS.bad}"/>`).join(''),
      label(CENTER[0], CENTER[1] - SIDE * 0.87 - 22, '5 سم', { color: '#1b2333' }),
      arrow([CENTER[0] - SIDE + 8, CENTER[1]], [CENTER[0] + SIDE - 8, CENTER[1]], '#1b2333'),
      arrow([CENTER[0] + SIDE - 8, CENTER[1]], [CENTER[0] - SIDE + 8, CENTER[1]], '#1b2333'),
      label(CENTER[0], CENTER[1] - 8, '10 سم', { color: '#1b2333' })
    ),
    spots: [{ x: CENTER[0] + SIDE + 16, y: CENTER[1] - 6, t: 'سر المسدس', d: 'ضلع المسدس = نص قطر الدايرة بالظبط. عشان كده لو فتحت البرجل 5 سم ولفّيت بيها على الدايرة، هتقسمها 6 حتت متساويين.' }]
  },
  {
    say: 'حط حتة شريط على كل ضلع عشان تتأكد إن المقاس مظبوط قبل ما تقص.',
    svg: scene(`<rect x="40" y="24" width="520" height="296" rx="6" fill="#c79a5b"/>`, hexRing(CENTER[0], CENTER[1], { len: SIDE, links: false })),
    spots: [{ x: 470, y: 60, t: 'لو مش مظبوط', d: 'لو الحتت أطول من الأضلاع، ارسم دايرة أكبر شوية. الحتة طولها ثابت (5 سم)، فالرسمة هي اللي تتظبط عليها.' }]
  }
]

export const cutScene: SceneFrame[] = [
  {
    say: 'دوّر على <b>علامة المقص</b>: خط صغير بين نقط النحاس، كل 3 لمبات. ده المكان الوحيد اللي ينفع تقص فيه.',
    svg: scene(strip(75, 180, 3, { pulseMarks: true })),
    spots: [{ x: 225, y: 118, t: 'علامة المقص', d: 'في شريط 60 لمبة/متر بتيجي كل <b>5 سم</b>. أي قص في حتة تانية بيقطع الدايرة بتاعة الـ 3 لمبات دول.' }]
  },
  {
    say: 'قص <b>في نص نقط النحاس بالظبط</b>، عشان يفضل نحاس من الناحيتين تلحم عليه.',
    svg: scene(
      `<rect x="70" y="120" width="460" height="110" rx="6" fill="${COLORS.pcb}" stroke="#bdb6a0"/>`,
      `<rect x="270" y="132" width="60" height="30" fill="${COLORS.copper}"/><rect x="270" y="188" width="60" height="30" fill="${COLORS.copper}"/>`,
      `<rect x="130" y="158" width="44" height="34" rx="4" fill="${COLORS.ledOff}" stroke="#a49d84"/><rect x="426" y="158" width="44" height="34" rx="4" fill="${COLORS.ledOff}" stroke="#a49d84"/>`,
      `<line x1="300" y1="100" x2="300" y2="250" stroke="${COLORS.ok}" stroke-width="4" stroke-dasharray="8 5"/>`, tick(300, 92),
      `<line x1="215" y1="100" x2="215" y2="250" stroke="${COLORS.bad}" stroke-width="4" stroke-dasharray="8 5"/>`, cross(215, 92),
      label(300, 280, 'هنا', { color: COLORS.ok }), label(215, 280, 'مش هنا', { color: COLORS.bad })
    ),
    spots: [
      { x: 300, y: 300, t: 'القص الصح', d: 'المقص في نص النحاس: كل حتة ياخد نص النقطة، وتقدر تلحم سلك على كل نص.' },
      { x: 215, y: 300, t: 'القص الغلط', d: 'لو قصيت بين اللمبة والنحاس، الـ 3 لمبات دول اتقطعوا ومش هينوّروا تاني. ارميهم وقص حتة جديدة.' }
    ]
  },
  {
    say: 'اقطع <b>6 حتت</b> لكل حلقة. لحلقتين: <b>12 حتة</b> = 60 سم من الشريط. وجرّب كل حتة على الأدابتر.',
    svg: scene(
      ...[0, 1, 2].map(i => piece(60 + i * 170, 110, 0, { lit: true })),
      ...[0, 1, 2].map(i => piece(60 + i * 170, 230, 0, { lit: true })),
      ...[0, 1, 2, 3, 4, 5].map(i => label(135 + (i % 3) * 170, i < 3 ? 80 : 200, String(i + 1), { color: COLORS.amber }))
    ),
    spots: [{ x: 540, y: 300, t: 'ليه تجرّب كل حتة؟', d: 'عشان لو حتة بايظة تعرفها <b>قبل</b> ما تلحمها في الحلقة. بعد اللحام هتدوّر عليها كتير.' }]
  }
]

const ZOOM = 1.8
const CORNER: Pt = [330, 112]
const BIG = 120
const GAP = 12
const A_START: Pt = [-GAP - BIG, 0]
const B_ROT = 60
const B_START: Pt = [GAP * Math.cos(Math.PI / 3), GAP * Math.sin(Math.PI / 3)]
const aEnd = (sign: '+' | '-') => padAt(A_START[0], A_START[1], 0, BIG, 'end', sign)
const bStart = (sign: '+' | '-') => padAt(B_START[0], B_START[1], B_ROT, BIG, 'start', sign)
const zoomed = (svg: string) => `<g transform="translate(${CORNER[0]} ${CORNER[1]}) scale(${ZOOM})">${svg}</g>`

const RING_C: Pt = [300, 176]
const RING_R = 108

const growing = (count: number, say: string): SceneFrame => ({
  say,
  svg: hexRing(RING_C[0], RING_C[1], { len: RING_R, count, numbers: true }),
  spots: count === 6
    ? [{ x: hexVertices(RING_C[0], RING_C[1], RING_R)[0][0] - 26, y: hexVertices(RING_C[0], RING_C[1], RING_R)[0][1] - 16, t: 'الركن المفتوح', d: 'بين آخر حتة (6) وأول حتة (1) <b>مفيش سلوك</b>. أول حتة هي اللي هيتلحم فيها السلكين اللي جايين من البورد.' }]
    : [{ x: 520, y: 60, t: 'خلي الحتت لفوق', d: 'اللمبات ناحيتك، والنحاس + على <b>برّه</b> المسدس في كل الحتت. كده الـ + دايماً يقابل + في كل ركن.' }]
})

export const joinScene: SceneFrame[] = [
  {
    say: 'افتح <b>كابل نت</b> قديم: جواه 8 سلوك رفيعة. خد <b>البرتقالي</b> للـ + و<b>الأزرق</b> للـ −، واقطع حتت <b>2 سم</b> وقشّر 3 مم من كل طرف.',
    svg: scene(
      wire([[30, 170], [230, 170]], '#7d8696', 18),
      ...['#ff9f43', '#f5f5f5', '#2f9e44', '#3b82f6', '#a16207', '#e7ecf5', '#9aa6bd', '#22c55e'].map((c, i) =>
        wire([[230, 170], [300, 104 + i * 19], [350, 104 + i * 19]], c, 3)),
      ...[0, 1, 2].map(i => wire([[420 + i * 50, 120], [452 + i * 50, 120]], COLORS.orange, 4)),
      ...[0, 1, 2].map(i => wire([[420 + i * 50, 220], [452 + i * 50, 220]], COLORS.blue, 4)),
      label(490, 95, 'برتقالي = +', { color: COLORS.orange }), label(490, 255, 'أزرق = −', { color: COLORS.minus })
    ),
    spots: [{ x: 130, y: 205, t: 'ليه كابل نت؟', d: 'سلوكه رفيعة ونحاس صافي وملونة، ومعزولة كويس. وتقريباً كل بيت فيه كابل قديم مرمي.' }]
  },
  {
    say: '<b>قصدر</b> نقط النحاس في طرفين كل حتة: لمسة كاوية + شوية قصدير = نقطة لامعة صغيرة. وقصدر طرف السلك كمان.',
    svg: scene(
      `<rect x="120" y="150" width="360" height="120" rx="6" fill="${COLORS.pcb}" stroke="#bdb6a0"/>`,
      `<rect x="250" y="168" width="70" height="36" fill="${COLORS.copper}"/><ellipse cx="285" cy="186" rx="26" ry="12" fill="#cfd5dd"/>`,
      `<rect x="250" y="218" width="70" height="36" fill="${COLORS.copper}"/>`,
      `<line x1="440" y1="40" x2="300" y2="172" stroke="#9aa6bd" stroke-width="10" stroke-linecap="round"/><line x1="520" y1="-20" x2="440" y2="40" stroke="#2b2b2b" stroke-width="22" stroke-linecap="round"/>`,
      `<line x1="150" y1="60" x2="268" y2="172" stroke="#d9dee5" stroke-width="4"/>`,
      label(150, 50, 'قصدير', { size: 13 }), label(450, 90, 'كاوية', { size: 13 }), label(232, 192, '+', { size: 18, color: '#8a4b10' }), label(232, 242, '−', { size: 18, color: '#8a4b10' })
    ),
    spots: [
      { x: 200, y: 186, t: 'نقطة قصدير', d: 'صغيرة ولامعة زي النقطة. لو كبيرة أوي ممكن تسيح على النقطة اللي جنبها (+ في −).' },
      { x: 300, y: 300, t: '3 ثواني بس', d: 'النحاس في الشريط رقيق، لو الكاوية فضلت أكتر من 3 ثواني بيتقلع. ابعد، استنى، وارجع.' }
    ]
  },
  {
    say: '<b>الركن الواحد بالتكبير:</b> آخر حتة 1 وأول حتة 2 بينهم مسافة صغيرة. سلكة <b>برتقالي من + لـ +</b> (برّه)، وسلكة <b>أزرق من − لـ −</b> (جوه).',
    svg: scene(
      zoomed(piece(A_START[0], A_START[1], 0, { len: BIG }) + piece(B_START[0], B_START[1], B_ROT, { len: BIG }) +
        wire([aEnd('+'), [3, -15], bStart('+')], COLORS.orange, 2.4) + wire([aEnd('-'), bStart('-')], COLORS.blue, 2.4)),
      label(200, 72, 'حتة 1', { color: COLORS.amber, size: 16 }),
      label(440, 200, 'حتة 2', { color: COLORS.amber, size: 16, anchor: 'start' }),
      label(372, 70, '+ ← +', { color: COLORS.orange, size: 16, anchor: 'start' }),
      label(262, 172, '− ← −', { color: COLORS.minus, size: 16 })
    ),
    spots: [
      { x: 470, y: 66, t: 'البرتقالي برّه', d: 'نقطة <b>+</b> بتاعة كل الحتت على الناحية <b>البرّانية</b> من المسدس، فالسلكة البرتقاني بتلف حوالين الركن من برّه.' },
      { x: 262, y: 206, t: 'الأزرق جوه', d: 'نقطة <b>−</b> على الناحية <b>الجوّانية</b>. السلكة الأزرق أقصر لأنها جوه الركن.' },
      { x: 120, y: 172, t: 'المسافة بين الحتتين', d: 'سيب حوالي 3 مم بين الحتتين عشان السلكتين يتلحموا براحة ومايلمسوش بعض.' }
    ]
  },
  growing(2, '<b>ابدأ بحتة 1 وحتة 2:</b> حطهم على رسمة المسدس ووصّلهم في الركن اللي بينهم زي اللقطة اللي فاتت.'),
  growing(4, '<b>كمّل بنفس الطريقة:</b> حتة 3 بعد 2، وحتة 4 بعد 3. كل ركن فيه سلكتين: برتقالي برّه وأزرق جوه.'),
  growing(6, '<b>آخر حتة (6):</b> الحلقة خلصت، بس <b>الركن بين 6 و1 يفضل مفتوح</b> من غير سلوك.'),
  {
    say: 'جرّب: الأدابتر على + و− بتوع <b>حتة 1</b> عند الركن المفتوح. <b>الـ 18 لمبة</b> كلهم ينوّروا.',
    svg: scene(hexRing(RING_C[0], RING_C[1], { len: RING_R, lit: true })),
    spots: [{ x: 540, y: 176, t: 'لو حتة مطفية', d: 'هي واللي بعدها مطفيين؟ يبقى الركن اللي قبلها: سلكة مقطوعة أو + اتوصل في −. صلّحه وجرّب تاني.' }]
  }
]

const BAND = 36

export const baseScene: SceneFrame[] = [
  {
    say: 'من <b>غطا علبة بلاستيك</b> اقطع <b>حلقة</b>: ارسم دايرة كبيرة (قطر 12 سم) ودايرة صغيرة جواها (قطر 8 سم)، وقص على الخطين.',
    svg: scene(
      `<circle cx="300" cy="172" r="140" fill="#7d8696"/>`,
      `<circle cx="300" cy="172" r="${RING_R + BAND / 2}" fill="none" stroke="#1b2333" stroke-width="2" stroke-dasharray="6 5"/>`,
      `<circle cx="300" cy="172" r="${RING_R - BAND / 2}" fill="none" stroke="#1b2333" stroke-width="2" stroke-dasharray="6 5"/>`,
      label(300, 178, 'غطا علبة'), label(452, 60, '✂', { size: 28, color: COLORS.amber })
    ),
    spots: [{ x: 300, y: 64, t: 'أي غطا ينفع', d: 'غطا علبة جبنة أو لانشون أو برطمان كبير، أو CD قديمة. المهم يكون ناشف ومايتنيش.' }]
  },
  {
    say: 'دي <b>القاعدة</b>: حلقة عرضها حوالي 2 سم. لزّق عليها <b>ورق ألومنيوم</b> (اللامع لفوق).',
    svg: scene(
      `<circle cx="${RING_C[0]}" cy="${RING_C[1]}" r="${RING_R}" fill="none" stroke="#7d8696" stroke-width="${BAND + 6}"/>`,
      `<circle cx="${RING_C[0]}" cy="${RING_C[1]}" r="${RING_R}" fill="none" stroke="#cfd5dd" stroke-width="${BAND - 4}"/>`,
      label(RING_C[0], RING_C[1] + 5, 'القاعدة + ألومنيوم', { size: 13, color: COLORS.muted })
    ),
    spots: [{ x: RING_C[0] + RING_R + 34, y: RING_C[1], t: 'ليه ألومنيوم؟', d: 'بيعكس النور اللي رايح لورا ويرجّعه لقدام، فالحلقة تبان أقوى.' }]
  },
  {
    say: 'حط <b>المسدس اللي وصّلته</b> على القاعدة واللمبات لفوق، ولزّق كل حتة بنقطة شمع (للتجربة) أو سيليكون (للعربية).',
    svg: scene(
      `<circle cx="${RING_C[0]}" cy="${RING_C[1]}" r="${RING_R - 8}" fill="none" stroke="#7d8696" stroke-width="${BAND + 6}"/>`,
      `<circle cx="${RING_C[0]}" cy="${RING_C[1]}" r="${RING_R - 8}" fill="none" stroke="#cfd5dd" stroke-width="${BAND - 4}"/>`,
      hexRing(RING_C[0], RING_C[1], { len: RING_R })
    ),
    spots: [{ x: RING_C[0], y: RING_C[1], t: 'المسدس جوه الحلقة', d: 'الأركان بتقع على حرف القاعدة البرّاني، ونص كل ضلع على الحرف الجوّاني. لو مش راكب، كبّر أو صغّر الحلقة شوية.' }]
  },
  {
    say: '<b>من الجنب:</b> فوق اللمبات حلقة من <b>جركن لبن أبيض</b> على مسافة <b>5–8 مم</b>، مرفوعة بنقط شمع. ده اللي بيخلّي النقط تبقى خط واحد.',
    svg: scene(
      `<rect x="80" y="270" width="440" height="16" rx="3" fill="#7d8696"/>`, label(540, 283, 'الغطا', { size: 13, anchor: 'start' }),
      `<rect x="80" y="264" width="440" height="6" fill="#cfd5dd"/>`, label(540, 266, 'ألومنيوم', { size: 13, anchor: 'start' }),
      `<rect x="110" y="250" width="380" height="14" rx="2" fill="${COLORS.pcb}" stroke="#bdb6a0"/>`,
      ...[170, 300, 430].map(x => `<rect x="${x - 14}" y="240" width="28" height="10" rx="2" fill="${COLORS.ledOn}" stroke="#a49d84"/>` +
        `<path d="M${x - 10} 238 L${x - 40} 196 M${x} 238 L${x} 196 M${x + 10} 238 L${x + 40} 196" stroke="#fff6c8" stroke-width="2" opacity=".6"/>`),
      label(540, 250, 'الشريط', { size: 13, anchor: 'start' }),
      `<rect x="90" y="196" width="20" height="54" rx="6" fill="#f2d98a"/><rect x="490" y="196" width="20" height="54" rx="6" fill="#f2d98a"/>`,
      label(100, 186, 'شمع', { size: 12 }),
      `<rect x="80" y="182" width="440" height="12" rx="3" fill="#fdfdfb" opacity=".92"/>`, label(540, 192, 'جركن لبن', { size: 13, anchor: 'start' }),
      `<rect x="80" y="150" width="440" height="26" fill="${COLORS.glow}" opacity=".35" filter="url(#sc-blur)"/>`,
      arrow([60, 238], [60, 198]), arrow([60, 198], [60, 238]), label(52, 222, '5–8 مم', { size: 12, color: COLORS.amber, anchor: 'end' }),
      label(300, 70, '👁 انت بتبص من هنا', { size: 15 }), arrow([300, 84], [300, 130], COLORS.muted)
    ),
    spots: [{ x: 300, y: 300, t: 'ليه المسافة؟', d: 'كل لمبة بتطلّع نور على شكل مخروط. على بعد 5–8 مم المخاريط بتدخل في بعض على الجركن، فيبان خط واحد. لو أقرب هتشوف نقط، ولو أبعد النور يبهت.' }]
  },
  {
    say: 'الفرق: من غير ناشر هتشوف <b>نقط</b>. بالناشر <b>خط واحد ناعم</b> زي الـ Angel eye الأصلي.',
    svg: scene(hexRing(165, 170, { len: 80, lit: true, links: false }), hexRing(435, 170, { len: 80, smooth: true, links: false }),
      label(165, 300, 'من غير ناشر'), label(435, 300, 'بالناشر'), cross(165, 40), tick(435, 40))
  }
]

const FIRST = hexSides(RING_C[0], RING_C[1] + 10, 96)[0]
const firstPad = (sign: '+' | '-') => padAt(FIRST.start[0], FIRST.start[1], FIRST.rot, FIRST.len, 'start', sign)

export const leadsScene: SceneFrame[] = [
  {
    say: 'هات سلك <b>شاحن موبايل قديم</b>: الأحمر على <b>+</b> حتة 1 والأسود على <b>−</b> حتة 1، عند الركن المفتوح. وثبّت السلك بنقطة شمع.',
    svg: scene(
      hexRing(RING_C[0], RING_C[1] + 10, { len: 96, numbers: true }),
      wire([[20, 320], [110, 320]], '#2b2b2b', 12),
      wire([[110, 316], [170, 316], [170, firstPad('+')[1] - 26], [firstPad('+')[0], firstPad('+')[1] - 26], firstPad('+')], COLORS.plus, 3),
      wire([[110, 324], [186, 324], [186, firstPad('-')[1] + 30], [firstPad('-')[0] - 4, firstPad('-')[1] + 30], firstPad('-')], '#2b2b2b', 3),
      label(65, 306, 'سلك شاحن', { size: 13 })
    ),
    spots: [
      { x: firstPad('+')[0] + 30, y: firstPad('+')[1] - 40, t: 'الأحمر على +', d: 'على نقطة + في أول حتة 1 (عند الركن المفتوح). عليه جلبة حرارية أو نقطة سيليكون.' },
      { x: 140, y: 230, t: 'متشدّش من اللحام', d: 'ثبّت السلك على القاعدة بنقطة شمع قبل اللحام بـ 2 سم. كده لو اتشد، الشمع هو اللي يشيل مش اللحام.' }
    ]
  },
  {
    say: 'اعمل الحلقة التانية بنفس الطريقة. دلوقتي عندك حلقتين، كل واحدة ليها سلكين.',
    svg: scene(ringGlyph(170, 160, 80), ringGlyph(430, 160, 80), label(170, 290, 'الفانوس اليمين'), label(430, 290, 'الفانوس الشمال')),
    spots: [{ x: 300, y: 160, t: 'كل حلقة ≈ 128mA', d: 'الحلقتين مع بعض حوالي <b>256mA</b> والموتور دوّار. الفيوز 1A كفاية جداً.' }]
  }
]

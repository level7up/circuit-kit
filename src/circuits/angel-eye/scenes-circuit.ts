import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, battery, label, meter, ringGlyph, scene, wire } from '../../lib/scene/draw'

const RAIL = 80
const GROUND = 280
const LINE = '#cbd5ea'

const ln = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="2.5"/>`

function protection(lit: boolean): string {
  return ln(40, RAIL, 104, RAIL) + `<path d="M104 ${RAIL - 16} L136 ${RAIL} L104 ${RAIL + 16} Z" fill="${LINE}"/>` + ln(136, RAIL - 16, 136, RAIL + 16) + ln(136, RAIL, 520, RAIL) +
    label(40, RAIL - 14, 'IN ← سلك الركن', { color: COLORS.plus, anchor: 'start' }) + label(120, RAIL + 38, 'D1', { size: 13 }) +
    ln(230, RAIL, 230, 166) + `<path d="M214 196 L230 168 L246 196 Z" fill="${LINE}"/>` + ln(212, 166, 248, 166) + ln(230, 196, 230, GROUND) + label(258, 188, 'D2', { size: 13, anchor: 'start' }) +
    ln(330, RAIL, 330, 174) + ln(312, 174, 348, 174) + ln(312, 186, 348, 186) + ln(330, 186, 330, GROUND) + label(356, 186, 'C1', { size: 13, anchor: 'start' }) +
    ln(470, RAIL, 470, 136) + ringGlyph(470, 180, 40, lit) + ln(470, 224, 470, GROUND) + label(520, 186, 'الحلقتين', { size: 13, anchor: 'start' }) +
    ln(40, GROUND, 520, GROUND) + label(40, GROUND + 24, 'GND ← الشاسيه', { anchor: 'start', color: COLORS.muted })
}

export const boardScene: SceneFrame[] = [
  {
    say: 'دي الدايرة كلها: <b>3 قطع</b> بتحمي الحلقتين. الحلقتين بعدهم على طول بين <b>+12V</b> و<b>الأرضي</b>.',
    svg: protection(true),
    spots: [
      { x: 120, y: 40, t: 'D1 · 1N4007', d: 'بيعدّي الكهربا في اتجاه واحد. لو السلكين اتعكسوا وانت بتركّب، D1 بيقفل ومفيش حاجة تتحرق.' },
      { x: 230, y: 226, t: 'D2 · P6KE18A', d: 'لما الدينامو يطلّع نبضة عالية (لما تفصل حمل كبير مثلاً)، D2 بيوصّلها للأرضي قبل ما توصل للشريط.' },
      { x: 330, y: 226, t: 'C1 · 100nF', d: 'مكثف صغير (104) بيمتص الشوشرة السريعة على خط الـ 12V. ملوش اتجاه.' },
      { x: 470, y: 124, t: 'الحلقتين', d: 'الشريط الـ 12V فيه مقاومات جواه، فمش محتاج مقاومة ولا ترانزستور: تولّع الركن ينوّر، تطفيه يطفي.' }
    ]
  },
  {
    say: 'لما الركن يطفي، سلك الركن بيبقى صفر فولت والحلقتين يطفوا على طول. مفيش حاجة بتسحب من البطارية والعربية واقفة.',
    svg: protection(false),
    spots: [{ x: 300, y: 40, t: 'من غير مفتاح', d: 'سلك الركن نفسه هو المفتاح: العربية بتوصّل له 12V لما تولّع الركن بس.' }]
  }
]

const BOARD = { x: 250, y: 120, w: 110, h: 70 }

const benchWiring = (lit: boolean, plugged: boolean): string => scene(
  plugged ? adapter(30, 120, [BOARD.x, BOARD.y + 20], [BOARD.x, BOARD.y + 50]) : `<rect x="30" y="120" width="96" height="64" rx="10" fill="#1d2230" stroke="#4a5263" stroke-width="2"/>` + label(78, 158, 'مفصول', { size: 13, color: COLORS.muted }),
  `<rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.w}" height="${BOARD.h}" rx="6" fill="#c9a76a" stroke="#8a6b30" stroke-width="2"/>`,
  label(BOARD.x + BOARD.w / 2, BOARD.y + 40, 'الحماية', { color: '#1b2333' }),
  wire([[BOARD.x + BOARD.w, BOARD.y + 18], [430, BOARD.y + 18], [430, 70], [520, 70]], '#f5c518', 3),
  wire([[BOARD.x + BOARD.w, BOARD.y + 52], [446, BOARD.y + 52], [446, 280], [520, 280]], COLORS.blue, 3),
  ringGlyph(520, 120, 34, lit), ringGlyph(520, 230, 34, lit),
  wire([[520, 70], [520, 86]], '#f5c518', 3), wire([[520, 280], [520, 264]], COLORS.blue, 3)
)

export const benchScene: SceneFrame[] = [
  {
    say: 'وصّل: الأدابتر على <b>الأحمر والأسود</b>، والحلقتين على <b>الأصفر (+)</b> و<b>الأزرق (−)</b>.',
    svg: benchWiring(false, false),
    spots: [
      { x: BOARD.x + BOARD.w / 2, y: BOARD.y - 20, t: 'البورد', d: 'اللي لحمته في تبويب التجميع. 4 سلوك: أحمر وأسود داخلين، وأصفر وأزرق طالعين.' },
      { x: 400, y: 175, t: 'الحلقتين على التوازي', d: 'الـ + بتوع الحلقتين مع بعض على الأصفر، والـ − مع بعض على الأزرق.' }
    ]
  },
  {
    say: 'ركّب الأدابتر في الكهربا: الحلقتين <b>ينوّروا على طول</b>.',
    svg: benchWiring(true, true)
  },
  {
    say: 'شيل الأدابتر: الحلقتين <b>يطفوا على طول</b>. ده بالظبط اللي هيحصل في العربية مع زرار الركن.',
    svg: benchWiring(false, false)
  }
]

const BOLT = '<circle cx="460" cy="250" r="14" fill="#9aa6bd" stroke="#4a5263" stroke-width="3"/><path d="M452 250 H468 M460 242 V258" stroke="#4a5263" stroke-width="3"/>'

export const carScene: SceneFrame[] = [
  {
    say: '<b>أول حاجة:</b> افصل سالب البطارية (مفتاح 10). كده مفيش أي قصر ممكن يحصل وانت شغال.',
    svg: scene(battery(200, 170, true), label(400, 90, '🔧', { size: 40 }), arrow([360, 104], [330, 120])),
    spots: [{ x: 319, y: 130, t: 'السالب بس', d: 'شيل السالب (−) بس، مش الموجب. ولفّه بعيد عن القطب عشان ميلمسوش بالغلط.' }]
  },
  {
    say: 'دوّر على سلك لمبة الركن بالملتيميتر: <b>12V والركن شغال</b>، و<b>صفر والركن مطفي</b>.',
    svg: scene(meter(130, 40, '12.4V'), meter(390, 40, '0.0V'), label(165, 190, 'الركن شغال', { color: COLORS.ok }), label(425, 190, 'الركن مطفي', { color: COLORS.muted }),
      wire([[60, 260], [540, 260]], '#f5c518', 6), label(300, 300, 'سلك لمبة الركن', { size: 13 })),
    spots: [{ x: 300, y: 230, t: 'ليه سلك الركن؟', d: 'عشان الحلقتين يولّعوا مع الركن بس، ومايسحبوش من البطارية والعربية مطفية.' }]
  },
  {
    say: 'اسحب فرع من السلك بـ <b>Tap</b>، وعليه <b>فيوز 1A</b>، ورايح للسلك <b>الأحمر</b>. والأسود على <b>مسمار شاسيه</b> نضيف.',
    svg: scene(
      wire([[40, 90], [560, 90]], '#f5c518', 6),
      `<rect x="150" y="78" width="30" height="24" rx="4" fill="#3b82f6"/>`,
      wire([[165, 102], [165, 170], [220, 170]], COLORS.plus, 4),
      `<rect x="220" y="158" width="56" height="24" rx="5" fill="#2a1414" stroke="${COLORS.plus}" stroke-width="2"/>`, label(248, 175, '1A', { size: 13, color: '#ff9a9a' }),
      wire([[276, 170], [360, 170]], COLORS.plus, 4),
      `<rect x="360" y="140" width="80" height="70" rx="6" fill="#c9a76a" stroke="#8a6b30" stroke-width="2"/>`, label(400, 180, 'الدايرة', { color: '#1b2333', size: 13 }),
      wire([[380, 210], [380, 250], [446, 250]], '#2b2b2b', 4), BOLT, label(460, 290, 'شاسيه', { size: 13 })
    ),
    spots: [
      { x: 165, y: 56, t: 'Tap (وصلة تفريع)', d: 'بتدبّس على السلك من غير ما تقطعه، وتطلّع منه فرع. لمبة الركن الأصلية تفضل شغالة.' },
      { x: 248, y: 210, t: 'الفيوز', d: 'أقرب حاجة للـ Tap. لو حصل قصر في أي حتة بعده، الفيوز يتحرق بدل السلك.' },
      { x: 500, y: 250, t: 'أرضي نضيف', d: 'مسمار في الحديد مش في البلاستيك. اكشط الدهان حواليه لو لازم عشان الوصلة تبقى كويسة.' }
    ]
  },
  {
    say: 'ثبّت الحلقتين حوالين الفانوسين بسيليكون، ووصّل السالب، وولّع الركن.',
    svg: scene(
      `<path d="M60 240 Q60 100 300 90 Q540 100 540 240 Z" fill="#3a4252" stroke="#1b202a" stroke-width="4"/>`,
      `<ellipse cx="170" cy="190" rx="76" ry="40" fill="#1a1f29"/><ellipse cx="430" cy="190" rx="76" ry="40" fill="#1a1f29"/>`,
      ringGlyph(170, 190, 30), ringGlyph(430, 190, 30)
    ),
    spots: [{ x: 300, y: 150, t: 'جرّب بالليل', d: 'بص عليها من بعيد بالليل: لو حتة مطفية أو الناشر مش ثابت هيبان على طول.' }]
  }
]

export const sealScene: SceneFrame[] = [
  {
    say: 'الدايرة في <b>علبة بلاستيك صغيرة</b> (أو جلبة حرارية كبيرة)، وسيليكون على الفتحة اللي داخلة منها السلوك.',
    svg: scene(
      `<rect x="170" y="90" width="260" height="170" rx="14" fill="#1d2230" stroke="#4a5263" stroke-width="3"/>`,
      `<rect x="250" y="140" width="100" height="70" rx="6" fill="#c9a76a" stroke="#8a6b30" stroke-width="2"/>`,
      wire([[100, 175], [250, 175]], COLORS.plus, 4), wire([[100, 192], [250, 192]], '#2b2b2b', 4),
      `<ellipse cx="172" cy="184" rx="14" ry="26" fill="#e9eef5" opacity=".75"/>`, label(172, 140, 'سيليكون', { size: 13 })
    ),
    spots: [{ x: 172, y: 236, t: 'الفتحة', d: 'المية بتدخل من هنا. سيليكون من برّه ومن جوه، وسيبه يجف 24 ساعة.' }]
  },
  {
    say: 'غطّي ضهر الحلقة ونقط اللحام بـ <b>سيليكون</b>، وثبّت السلك بأفيز بعيد عن الموتور.',
    svg: scene(ringGlyph(300, 170, 100, false), ...[0, 60, 120, 180, 240, 300].map(a => {
      const r = (a - 90) * (Math.PI / 180)
      return `<circle cx="${300 + 100 * Math.cos(r)}" cy="${170 + 100 * Math.sin(r)}" r="12" fill="#e9eef5" opacity=".8"/>`
    })),
    spots: [{ x: 420, y: 60, t: 'شمع ولا سيليكون؟', d: 'الشمع للتجربة بس: بيسيح في حر الصيف وجنب الفانوس. للتركيب سيليكون شفاف أو إيبوكسي.' }]
  }
]

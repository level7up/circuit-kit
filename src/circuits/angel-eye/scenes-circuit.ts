import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, battery, label, meter, ringGlyph, scene, wire } from '../../lib/scene/draw'

type Part = 'power' | 'fade' | 'drive'

const RAIL = 70
const GROUND = 290
const S_X = 300
const S_Y = 170
const LINE = '#cbd5ea'

const ln = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="2.5"/>`
const box = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0d1320" stroke="${LINE}" stroke-width="2.5"/>`

function powerPart(): string {
  return ln(40, RAIL, 84, RAIL) + `<path d="M84 ${RAIL - 14} L112 ${RAIL} L84 ${RAIL + 14} Z" fill="${LINE}"/>` + ln(112, RAIL - 14, 112, RAIL + 14) + ln(112, RAIL, 560, RAIL) +
    label(40, RAIL - 12, 'IN', { color: COLORS.plus, anchor: 'start' }) + label(98, RAIL + 34, 'D1', { size: 13 }) +
    ln(170, RAIL, 170, 166) + `<path d="M156 194 L170 168 L184 194 Z" fill="${LINE}"/>` + ln(154, 166, 186, 166) + ln(170, 194, 170, GROUND) + label(196, 186, 'D2', { size: 13, anchor: 'start' }) +
    ln(232, RAIL, 232, 174) + ln(216, 174, 248, 174) + ln(216, 184, 248, 184) + ln(232, 184, 232, GROUND) + label(256, 184, 'C1', { size: 13, anchor: 'start' }) +
    ln(40, GROUND, 560, GROUND) + label(40, GROUND + 22, 'GND', { anchor: 'start', color: COLORS.muted })
}

function fadePart(): string {
  return ln(S_X, RAIL, S_X, 100) + box(S_X - 9, 100, 18, 44) + ln(S_X, 144, S_X, S_Y) + label(S_X - 16, 128, 'R1', { size: 13, anchor: 'end' }) +
    `<circle cx="${S_X}" cy="${S_Y}" r="5" fill="${COLORS.amber}"/>` + label(S_X - 14, S_Y + 5, 'S', { color: COLORS.amber, anchor: 'end' }) +
    ln(S_X, S_Y, S_X, 216) + ln(S_X - 16, 216, S_X + 16, 216) + `<path d="M${S_X - 16} 230 Q${S_X} 222 ${S_X + 16} 230" fill="none" stroke="${LINE}" stroke-width="2.5"/>` + ln(S_X, 228, S_X, GROUND) +
    label(S_X + 22, 210, '+', { size: 13, anchor: 'start' }) + label(S_X - 16, 230, 'C2', { size: 13, anchor: 'end' }) +
    ln(S_X, S_Y, 330, S_Y) + box(330, S_Y - 9, 44, 18) + ln(374, S_Y, 420, S_Y) + label(352, S_Y - 16, 'R2', { size: 13 })
}

function drivePart(lit: boolean, fade: boolean): string {
  return `<circle cx="446" cy="${S_Y}" r="28" fill="none" stroke="${LINE}" stroke-width="2.5"/>` + ln(420, S_Y, 432, S_Y) + ln(432, S_Y - 16, 432, S_Y + 16) +
    ln(432, S_Y - 8, 460, S_Y - 26) + ln(460, S_Y - 26, 460, 140) + ln(432, S_Y + 8, 460, S_Y + 26) + `<path d="M452 ${S_Y + 16} L460 ${S_Y + 26} L448 ${S_Y + 26}" fill="none" stroke="${LINE}" stroke-width="2.5"/>` +
    ln(460, S_Y + 26, 460, GROUND) + label(486, S_Y + 46, 'Q1 TIP122', { size: 12, anchor: 'start' }) +
    ln(520, RAIL, 520, 96) + ln(460, 140, 520, 140) + ringGlyph(520, 118, 20, { lit, fade }) + label(548, 122, 'الحلقة', { size: 12, anchor: 'start' })
}

function schematic(focus: Part | 'all', lit = false, fade = false): string {
  const dim = (p: Part) => (focus === 'all' || focus === p ? '' : ' opacity=".2"')
  return `<g${dim('power')}>${powerPart()}</g><g${dim('fade')}>${fadePart()}</g><g${dim('drive')}>${drivePart(lit, fade)}</g>`
}

export const boardScene: SceneFrame[] = [
  {
    say: 'دي الدايرة كلها: <b>7 قطع</b>. بنقسمها 3 أجزاء، وكل جزء ليه مرحلة في تبويب <b>التجميع على البورد</b>.',
    svg: schematic('all'),
    spots: [
      { x: 98, y: 120, t: 'الحماية', d: 'D1 وD2 وC1: بيحموا الدايرة والحلقة من عكس السلوك ونبضات الدينامو.' },
      { x: S_X + 40, y: 230, t: 'الفيد', d: 'R1 وC2 وR2: بيخلّوا الجهد على قاعدة الترانزستور يطلع بالراحة.' },
      { x: 446, y: 236, t: 'التشغيل', d: 'الـ TIP122 بيعدّي تيار الحلقة على قد الجهد اللي على قاعدته.' }
    ]
  },
  {
    say: '<b>الحماية:</b> D1 بيعدّي الكهربا في اتجاه واحد، D2 بيشرب أي نبضة فوق 18V، وC1 بينضّف الشوشرة.',
    svg: schematic('power'),
    spots: [
      { x: 98, y: 40, t: 'D1 · 1N4007', d: 'لو السلكين اتعكسوا، D1 بيقفل ومفيش حاجة تتحرق. بياكل حوالي 0.7V.' },
      { x: 170, y: 226, t: 'D2 · P6KE18A', d: 'لما الدينامو يطلّع نبضة عالية (لما تفصل حمل كبير مثلاً)، D2 بيوصّلها للأرضي قبل ما توصل للترانزستور.' },
      { x: 232, y: 226, t: 'C1 · 100nF', d: 'مكثف صغير بيمتص الشوشرة السريعة على خط الـ 12V.' }
    ]
  },
  {
    say: '<b>الفيد:</b> R1 بيملا C2 بالراحة زي حنفية بتملا جردل. جهد <b>S</b> بيطلع من صفر لحوالي 9V في ثانية.',
    svg: schematic('fade'),
    spots: [
      { x: S_X - 40, y: 108, t: 'R1 · 10k = الحنفية', d: 'كل ما تكبر (22k) الحنفية تضيق والفيد يطوّل.' },
      { x: S_X + 46, y: 240, t: 'C2 · 100µF = الجردل', d: 'كل ما يكبر (220µF) ياخد وقت أطول عشان يتملا، فالفيد يطوّل. ده أسهل حاجة تغيّرها.' },
      { x: 352, y: 136, t: 'R2 · 22k', d: 'بتوصّل جهد S للقاعدة بتيار صغير. لو كبرت أوي (47k) الترانزستور مش هيقدر يولّع الحلقتين للآخر.' }
    ]
  },
  {
    say: '<b>التشغيل:</b> كل ما جهد S يعلى، الـ TIP122 يفتح أكتر، والحلقة تنوّر أكتر. لحد ما يفتح على الآخر.',
    svg: schematic('drive', true, true),
    spots: [
      { x: 404, y: 140, t: 'B · القاعدة', d: 'تيار صغير جداً هنا (ربع مللي أمبير) بيتحكم في تيار كبير (ربع أمبير) في الحلقة.' },
      { x: 488, y: 150, t: 'C · سالب الحلقة', d: 'الحلقة بين +12V والكولكتور. الترانزستور هو اللي بيقفل الدايرة للأرضي.' },
      { x: 490, y: 270, t: 'E · الأرضي', d: 'الإميتر على الأرضي على طول. الطبق المعدن متوصل بـ C، فمايلمسش الشاسيه.' }
    ]
  }
]

const BOARD = { x: 250, y: 120, w: 110, h: 70 }

export const fadeTestScene: SceneFrame[] = [
  {
    say: 'وصّل: الأدابتر على <b>الأحمر والأسود</b>، والحلقتين على <b>الأصفر (+)</b> و<b>الأزرق (−)</b>.',
    svg: scene(
      adapter(30, 120, [BOARD.x, BOARD.y + 20], [BOARD.x, BOARD.y + 50]),
      `<rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.w}" height="${BOARD.h}" rx="6" fill="#c9a76a" stroke="#8a6b30" stroke-width="2"/>`,
      label(BOARD.x + BOARD.w / 2, BOARD.y + 40, 'الدايرة', { color: '#1b2333' }),
      wire([[BOARD.x + BOARD.w, BOARD.y + 18], [430, BOARD.y + 18], [430, 70], [520, 70]], '#f5c518', 3),
      wire([[BOARD.x + BOARD.w, BOARD.y + 52], [446, BOARD.y + 52], [446, 280], [520, 280]], COLORS.blue, 3),
      ringGlyph(520, 120, 34, { lit: false }), ringGlyph(520, 230, 34, { lit: false }),
      wire([[520, 70], [520, 86]], '#f5c518', 3), wire([[520, 280], [520, 264]], COLORS.blue, 3)
    ),
    spots: [
      { x: BOARD.x + BOARD.w / 2, y: BOARD.y - 20, t: 'الدايرة', d: 'اللي لحمتها في تبويب التجميع. 4 سلوك: أحمر وأسود داخلين، وأصفر وأزرق طالعين.' },
      { x: 400, y: 175, t: 'الحلقتين على التوازي', d: 'الـ + بتوع الحلقتين مع بعض على الأصفر، والـ − مع بعض على الأزرق.' }
    ]
  },
  {
    say: 'ركّب الأدابتر في الكهربا: الحلقتين <b>يولّعوا بالراحة</b> في حوالي ثانية. (الرسمة بتكرر الفيد.)',
    svg: scene(ringGlyph(170, 170, 90, { fade: true }), ringGlyph(430, 170, 90, { fade: true }), label(300, 320, '≈ 0.8 ثانية من صفر للآخر', { color: COLORS.amber })),
    spots: [{ x: 300, y: 60, t: 'عايز تشوفه بالأرقام؟', d: 'افتح تبويب <b>المحاكي</b>: هتشوف جهد C2 بيطلع والسطوع بيعلى معاه، وتقدر تجرّب مكثف أكبر أو أصغر.' }]
  },
  {
    say: 'افصل الأدابتر و<b>استنى 5 ثواني</b> قبل ما تجرّب تاني: المكثف محتاج وقت يفضى عشان الفيد يتكرر.',
    svg: scene(ringGlyph(170, 170, 90, { lit: false }), ringGlyph(430, 170, 90, { lit: false }), label(300, 186, '⏱ 5', { size: 44, color: COLORS.amber, weight: 900 })),
    spots: [{ x: 300, y: 260, t: 'ليه 5 ثواني؟', d: 'C2 بيفضى من خلال R2 وقاعدة الترانزستور. لو ولّعت بسرعة وهو لسه مليان، الحلقة هتولّع نصها على طول من غير فيد. ده طبيعي مش عطل.' }]
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
      ringGlyph(170, 190, 30, { fade: true }), ringGlyph(430, 190, 30, { fade: true })
    ),
    spots: [{ x: 300, y: 150, t: 'جرّب بالليل', d: 'بص عليها من بعيد بالليل: لو حتة مطفية أو الناشر مش ثابت هيبان على طول.' }]
  }
]

export const sealScene: SceneFrame[] = [
  {
    say: 'الدايرة في <b>علبة بلاستيك</b>، وسيليكون على الفتحة اللي داخلة منها السلوك.',
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
    svg: scene(ringGlyph(300, 170, 100, { lit: false }), ...[0, 60, 120, 180, 240, 300].map(a => {
      const r = (a - 90) * (Math.PI / 180)
      return `<circle cx="${300 + 100 * Math.cos(r)}" cy="${170 + 100 * Math.sin(r)}" r="12" fill="#e9eef5" opacity=".8"/>`
    })),
    spots: [{ x: 420, y: 60, t: 'شمع ولا سيليكون؟', d: 'الشمع للتجربة بس: بيسيح في حر الصيف وجنب الفانوس. للتركيب سيليكون شفاف أو إيبوكسي.' }]
  }
]

import type { SceneFrame } from '../../types/circuit'
import { COLORS, label, ringGlyph, scene, wire } from '../../lib/scene/draw'

const BOARD_FILL = '#c9a76a'
const RING_YELLOW = '#f5c518'

function flickerBoard(): string {
  return `<rect x="40" y="110" width="150" height="90" rx="8" fill="${BOARD_FILL}" stroke="#8a6b30" stroke-width="2"/>` +
    label(115, 150, 'دايرة الرعشة', { size: 13, color: '#1b2333' }) + label(115, 172, '📺', { size: 18 })
}

function latchButton(x: number, y: number, pressed: boolean): string {
  const cap = pressed ? 8 : 0
  return `<rect x="${x - 26}" y="${y}" width="52" height="34" rx="6" fill="#20252f" stroke="#4a5263" stroke-width="2"/>` +
    `<rect x="${x - 18}" y="${y - 22 + cap}" width="36" height="24" rx="5" fill="${pressed ? COLORS.ok : '#9aa6bd'}" stroke="#1b2333" stroke-width="2"/>` +
    label(x + 36, y + 22, pressed ? 'مضغوط' : 'طالع', { size: 12, color: pressed ? COLORS.ok : COLORS.muted, anchor: 'start' })
}

function wiring(pressed: boolean): string {
  const ground = '#2b2b2b'
  return scene(
    flickerBoard(),
    wire([[190, 130], [470, 130], [470, 184]], RING_YELLOW, 4), label(330, 120, 'RING+ (أصفر)', { size: 12, color: RING_YELLOW }),
    wire([[190, 180], [300, 180], [300, 270], [430, 270]], COLORS.minus, 4), label(240, 170, 'RING− (أزرق)', { size: 12, color: COLORS.minus }),
    wire([[300, 230], [180, 230], [180, 246]], COLORS.minus, 3),
    latchButton(180, 260, pressed),
    wire([[180, 294], [180, 320], [80, 320]], ground, 3), label(60, 324, 'الأرضي', { size: 12, color: COLORS.muted, anchor: 'end' }),
    ringGlyph(470, 230, 46, true),
    label(470, 310, pressed ? 'ثابتة' : 'بترعش', { size: 14, color: pressed ? COLORS.ok : COLORS.amber })
  )
}

export const buttonScene: SceneFrame[] = [
  {
    say: 'هات <b>زرار ضغط بيقفل</b> (Self-locking): تدوسه يفضل جوه، تدوسه تاني يطلع. وصّله بسلكين: واحد على <b>الأزرق (RING−)</b> والتاني على <b>الأرضي</b>.',
    svg: wiring(false),
    spots: [
      { x: 180, y: 252, t: 'زرار بيقفل', d: 'مكتوب عليه غالباً Self-locking أو Latching، 12–16 مم، وأي زرار 1A أو أكتر يكفي. الحلقتين بيسحبوا حوالي 0.26A بس.' },
      { x: 300, y: 214, t: 'فرع من الأزرق', d: 'من غير ما تقطع السلك: اسحب فرع بـ Tap أو لحام وجلبة حرارية، ورايح لرجل من رجلين الزرار.' }
    ]
  },
  {
    say: '<b>الزرار طالع:</b> الأزرق بيوصل للأرضي عن طريق ترانزستور الرعشة بس، فالحلقتين <b>بيرعشوا</b> زي التلفزيون القديم.',
    svg: wiring(false)
  },
  {
    say: '<b>الزرار مضغوط:</b> الأزرق بيوصل للأرضي على طول من الزرار، فالحلقتين <b>ثابتين</b>. دوسه تاني يرجعوا يرعشوا.',
    svg: wiring(true),
    spots: [{ x: 470, y: 160, t: 'ليه ثابت؟', d: 'ترانزستور الرعشة بيفتح ويقفل بسرعة على السالب. الزرار بيوصّل السالب بالأرضي مباشرة، فبيغطي عليه طول ما هو مضغوط.' }]
  }
]

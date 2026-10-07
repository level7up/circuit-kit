import type { SceneFrame } from '../../types/circuit'
import { COLORS, label, ringGlyph, scene, wire } from '../../lib/scene/draw'

const BOARD_FILL = '#c9a76a'
const RING_YELLOW = '#f5c518'
const GROUND = '#6b7280'
const ROCKER_X = 170
const ROCKER_Y = 230

type Rocker = 'middle' | 'latched' | 'held'

const TILT: Record<Rocker, number> = { middle: 0, latched: -14, held: 14 }
const STATE_TEXT: Record<Rocker, string> = { middle: 'في النص', latched: 'ناحية I', held: 'ضاغط' }

function flickerBoard(): string {
  return `<rect x="40" y="70" width="150" height="90" rx="8" fill="${BOARD_FILL}" stroke="#8a6b30" stroke-width="2"/>` +
    label(115, 110, 'دايرة الرعشة', { size: 13, color: '#1b2333' }) + label(115, 132, '📺', { size: 18 })
}

function rocker(state: Rocker): string {
  const x = ROCKER_X
  const y = ROCKER_Y
  const lit = state !== 'middle'
  const pins = [-24, 0, 24].map(dx => `<rect x="${x + dx - 4}" y="${y - 48}" width="8" height="18" fill="#c4ccd6"/>`).join('')
  return `<rect x="${x - 44}" y="${y - 30}" width="88" height="64" rx="6" fill="#20252f" stroke="#4a5263" stroke-width="2"/>` +
    `<g transform="rotate(${TILT[state]} ${x} ${y})"><rect x="${x - 34}" y="${y - 22}" width="68" height="46" rx="6" fill="${lit ? COLORS.ok : '#3a4252'}" stroke="#111" stroke-width="2"/>` +
    label(x - 18, y + 7, 'I', { size: 15, color: '#e7ecf5' }) + label(x + 18, y + 7, '(I)', { size: 12, color: '#e7ecf5' }) + `</g>` +
    pins + label(x, y + 56, STATE_TEXT[state], { size: 12, color: lit ? COLORS.ok : COLORS.muted })
}

function wiring(state: Rocker): string {
  const steady = state !== 'middle'
  return scene(
    flickerBoard(),
    wire([[190, 90], [470, 90], [470, 174]], RING_YELLOW, 4), label(330, 80, 'RING+ (أصفر)', { size: 12, color: RING_YELLOW }),
    wire([[190, 140], [330, 140], [330, 280], [430, 280]], COLORS.minus, 4), label(260, 130, 'RING− (أزرق)', { size: 12, color: COLORS.minus }),
    wire([[330, 160], [ROCKER_X, 160], [ROCKER_X, ROCKER_Y - 48]], COLORS.minus, 3),
    wire([[ROCKER_X + 24, ROCKER_Y - 48], [ROCKER_X + 24, 172], [ROCKER_X + 58, 172], [ROCKER_X + 58, 312], [ROCKER_X - 66, 312]], GROUND, 3),
    wire([[ROCKER_X - 24, ROCKER_Y - 48], [ROCKER_X - 24, 172], [ROCKER_X - 66, 172], [ROCKER_X - 66, 312], [70, 312]], GROUND, 3),
    label(62, 316, 'الأرضي', { size: 12, color: COLORS.muted, anchor: 'end' }),
    rocker(state),
    ringGlyph(470, 220, 46, true),
    label(470, 300, steady ? 'ثابتة' : 'بترعش', { size: 14, color: steady ? COLORS.ok : COLORS.amber })
  )
}

export const buttonScene: SceneFrame[] = [
  {
    say: 'السويتش <b>KCD4 ON-OFF-(ON)</b>: له 3 أوضاع. هنستخدم <b>صف واحد</b> من رجوله: <b>اللي في النص</b> على الأزرق (RING−)، و<b>الطرفين</b> موصّلين ببعض على الأرضي.',
    svg: wiring('middle'),
    spots: [
      { x: ROCKER_X + 90, y: ROCKER_Y - 40, t: 'الرجول', d: 'تحت السويتش 6 رجول في صفين. خد صف واحد: النص هو المشترك، والطرفين كل واحد بيتوصل بالنص في ناحية.' },
      { x: 250, y: 160, t: 'فرع من الأزرق', d: 'سلك من خط الأزرق للرجل اللي في النص، من البورد في V9 أو بـ Tap على السلك.' }
    ]
  },
  {
    say: '<b>في النص:</b> السويتش مفصول، والأزرق بيوصل للأرضي عن طريق ترانزستور الرعشة بس، فالحلقتين <b>بيرعشوا</b> زي التلفزيون القديم.',
    svg: wiring('middle')
  },
  {
    say: '<b>ناحية I:</b> بيفضل مكانه، والأزرق بيوصل للأرضي على طول، فالحلقتين <b>ثابتين</b> لحد ما ترجّعه للنص.',
    svg: wiring('latched'),
    spots: [{ x: 470, y: 150, t: 'ليه ثابت؟', d: 'ترانزستور الرعشة بيفتح ويقفل بسرعة على السالب. السويتش بيوصّل السالب بالأرضي مباشرة، فبيغطي عليه.' }]
  },
  {
    say: '<b>الناحية التانية (I):</b> بترجع للنص لوحدها لما تسيبها، فالحلقتين ثابتين <b>طول ما انت ضاغط بس</b>. مفيدة لو عايز تشوفها ثابتة لحظة.',
    svg: wiring('held')
  }
]

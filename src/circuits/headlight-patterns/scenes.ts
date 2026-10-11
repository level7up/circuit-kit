import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, battery, label, led5, scene, wire, type Pt } from '../../lib/scene/draw'
import { nets } from './board'

const BOARD_X = 40
const BOARD_Y = 70
const LUG_X0 = 360
const LUG_GAP = 42

function boardBox(title: string): string {
  return `<rect x="${BOARD_X}" y="${BOARD_Y}" width="170" height="220" rx="10" fill="#c9a76a" stroke="#6b5531" stroke-width="2"/>` +
    label(BOARD_X + 85, BOARD_Y + 30, title, { size: 13, color: '#1b2333' })
}

const padY = (i: number) => BOARD_Y + 60 + i * 30

function boardPad(i: number, name: string, color: string): string {
  return `<circle cx="${BOARD_X + 170}" cy="${padY(i)}" r="6" fill="${color}" stroke="#000"/>` +
    label(BOARD_X + 150, padY(i) + 5, name, { size: 13, color: '#1b2333', anchor: 'end' })
}

function lugRow(y: number, title: string, labels: string[]): string {
  return     `<circle cx="${LUG_X0}" cy="${y}" r="9" fill="#d0a24a" stroke="#7a5a1a"/>` + label(LUG_X0 - 14, y + 4, title, { size: 11, color: COLORS.muted, anchor: 'end' }) +
    labels.map((t, i) => `<rect x="${LUG_X0 + (i + 1) * LUG_GAP - 6}" y="${y - 8}" width="12" height="16" rx="2" fill="#d0a24a" stroke="#7a5a1a"/>` +
      label(LUG_X0 + (i + 1) * LUG_GAP, y - 16, t, { size: 11, color: COLORS.muted })).join('')
}

const lug = (row: number, n: number): Pt => [LUG_X0 + n * LUG_GAP, row === 0 ? 120 : 240]

const PADS: [string, string][] = [['L', nets.SL.c], ['R', nets.SR.c], ['A', nets.BA.c], ['B', nets.BB.c], ['C', nets.BC.c], ['D', nets.BD.c], ['E', nets.BE.c]]

function switchBase(): string {
  return scene(
    boardBox('البورد (الجنب اليمين)'),
    ...PADS.map(([t, c], i) => boardPad(i, t, c)),
    `<rect x="${LUG_X0 - 20}" y="80" width="${LUG_GAP * 4 + 40}" height="200" rx="14" fill="#1d2230" stroke="#2a3242"/>`,
    lugRow(120, 'COM 1', ['1', '2', '3', '4']),
    lugRow(240, 'COM 2', ['1', '2', '3', '4'])
  )
}

const padPt = (i: number): Pt => [BOARD_X + 170, padY(i)]

export const switchScene: SceneFrame[] = [
  {
    say: 'السويتش فيه <b>نصين</b>: كل نص ليه رجل في النص (<b>COM</b>) و4 رجول. <b>COM نص 1</b> على L، و<b>COM نص 2</b> على R.',
    svg: switchBase() +
      wire([padPt(0), [280, padPt(0)[1]], [280, 160], [LUG_X0, 160], lug(0, 0)], nets.SL.c, 3) +
      wire([padPt(1), [300, padPt(1)[1]], [300, 270], [LUG_X0, 270], lug(1, 0)], nets.SR.c, 3),
    spots: [{ x: LUG_X0, y: 300, t: 'فين الـ COM؟', d: 'في الضهر: الرجلين اللي أقرب للمحور. بالصفارة: لف المحور، والـ COM بيصفّر مع رجل مختلفة في كل وضع.' }]
  },
  {
    say: '<b>نص 1</b>: رجل 1 و2 و4 ببعض على <b>A</b>، ورجل 3 على <b>C</b>.<br><b>نص 2</b>: 1 ← <b>B</b>، و2 ← <b>A</b>، و3 ← <b>D</b>، و4 ← <b>E</b>.',
    svg: switchBase() +
      wire([lug(0, 1), [lug(0, 1)[0], 95], [lug(0, 4)[0], 95], lug(0, 4)], nets.BA.c, 3) +
      wire([lug(0, 2), [lug(0, 2)[0], 95]], nets.BA.c, 3) +
      wire([padPt(2), [250, padPt(2)[1]], [250, 140], [lug(0, 1)[0], 140], lug(0, 1)], nets.BA.c, 3) +
      wire([padPt(4), [262, padPt(4)[1]], [262, 180], [lug(0, 3)[0], 180], lug(0, 3)], nets.BC.c, 3) +
      wire([padPt(3), [274, padPt(3)[1]], [274, 205], [lug(1, 1)[0], 205], lug(1, 1)], nets.BB.c, 3) +
      wire([lug(0, 2), [lug(0, 2)[0] + 8, 170], [lug(1, 2)[0], 215], lug(1, 2)], nets.BA.c, 2) +
      wire([padPt(5), [286, padPt(5)[1]], [286, 300], [lug(1, 3)[0], 300], lug(1, 3)], nets.BD.c, 3) +
      wire([padPt(6), [240, padPt(6)[1]], [240, 318], [lug(1, 4)[0], 318], lug(1, 4)], nets.BE.c, 3),
    spots: [
      { x: lug(0, 4)[0], y: 80, t: 'وصلة 1–2–4', d: 'سلكة صغيرة ملفوفة على الرجول التلاتة ومتلحمة. كده وضع 1 و2 و4 الشمال من خط A (الخطوات 0–3).' },
      { x: 470, y: 330, t: 'وضع 2', d: 'رجل 2 في النصين على A: الشمال واليمين بيولّعوا مع بعض.' }
    ]
  }
]

export const benchScene: SceneFrame[] = [
  {
    say: 'قبل أي كشاف: أدابتر 12V على IN وGND، و<b>لمبة LED + 1k</b> من الـ 12V لـ <b>L−</b> ولمبة تانية لـ <b>R−</b>. دول حمل تجريبي بيستحمله أي غلط.',
    svg: scene(
      adapter(30, 40, [200, 120], [200, 250]),
      `<rect x="200" y="90" width="200" height="190" rx="10" fill="#c9a76a" stroke="#6b5531" stroke-width="2"/>`, label(300, 190, 'البورد', { size: 15, color: '#1b2333' }),
      led5(470, 120, true), led5(470, 240, false),
      wire([[400, 120], [458, 120]], nets.OL.c, 3), wire([[400, 240], [458, 240]], nets.OR.c, 3),
      wire([[482, 120], [540, 120], [540, 60], [220, 60], [220, 90]], COLORS.plus, 3),
      wire([[482, 240], [560, 240], [560, 50], [240, 50], [240, 90]], COLORS.plus, 3),
      label(470, 155, 'L− · 1k', { size: 12 }), label(470, 275, 'R− · 1k', { size: 12 })
    ),
    spots: [
      { x: 520, y: 180, t: 'LED + 1k', d: 'الرجل الطويلة على +12V عن طريق 1k، والقصيرة على L− أو R−. لما الموسفت يفتح، اللمبة تنوّر بحوالي 10mA.' },
      { x: 300, y: 300, t: 'أدابتر بفيوز', d: 'أدابتر الراوتر 12V (1A أو أقل) بيحدّ التيار لوحده: لو في قصر مفيش حاجة هتولّع.' }
    ]
  }
]

export const carScene: SceneFrame[] = [
  {
    say: 'كل كشاف ليه <b>فيوز 2A لوحده</b> من الـ + ، والـ − بتاعه بس اللي رايح للبورد. الدايرة نفسها من <b>فيوز 1A + السويتش الرئيسي</b>.',
    svg: scene(
      battery(20, 180),
      wire([[60, 90], [140, 90]], COLORS.plus, 5),
      `<rect x="140" y="78" width="40" height="24" rx="4" fill="#2a1414" stroke="${COLORS.plus}" stroke-width="2"/>`, label(160, 95, '1A', { size: 12, color: '#ff9a9a' }),
      wire([[180, 90], [220, 90]], COLORS.plus, 3), `<rect x="220" y="76" width="34" height="28" rx="4" fill="#111" stroke="#9aa6bd"/>`, label(237, 124, 'ON/OFF', { size: 11 }),
      wire([[254, 90], [300, 90], [300, 150]], COLORS.plus, 3),
      `<rect x="280" y="150" width="120" height="110" rx="10" fill="#c9a76a" stroke="#6b5531" stroke-width="2"/>`, label(340, 210, 'البورد', { size: 14, color: '#1b2333' }),
      wire([[60, 120], [100, 120], [100, 40], [440, 40], [440, 60]], COLORS.plus, 4),
      `<rect x="425" y="60" width="30" height="22" rx="4" fill="#2a1414" stroke="${COLORS.plus}"/>`, label(440, 76, '2A', { size: 11, color: '#ff9a9a' }),
      `<rect x="525" y="60" width="30" height="22" rx="4" fill="#2a1414" stroke="${COLORS.plus}"/>`, label(540, 76, '2A', { size: 11, color: '#ff9a9a' }),
      wire([[440, 40], [540, 40], [540, 60]], COLORS.plus, 4),
      wire([[440, 82], [440, 120]], COLORS.plus, 3), wire([[540, 82], [540, 120]], COLORS.plus, 3),
      `<circle cx="440" cy="140" r="20" fill="#eef5ff"/><circle cx="540" cy="140" r="20" fill="#2a3242" stroke="#566179"/>`,
      label(440, 180, 'كشاف ش', { size: 12 }), label(540, 180, 'كشاف ي', { size: 12 }),
      wire([[440, 160], [440, 200], [400, 200]], nets.OL.c, 3), wire([[540, 160], [540, 230], [400, 230]], nets.OR.c, 3),
      wire([[280, 250], [60, 250], [60, 230]], '#2b2b2b', 4), label(170, 275, 'GND تخين ← شاسيه', { size: 12, color: COLORS.muted }),
      arrow([490, 300], [445, 170])
    ),
    spots: [
      { x: 490, y: 310, t: 'كشافات لوحدها', d: 'كشافين LED صغيرين متركّبين لوحدهم. <b>متقطعش ولا توصّل</b> سلك الفانوس الأصلي أو الإشارة أو الفلاشر: الدايرة دي ملهاش أي علاقة بإضاءة العربية الرسمية.' },
      { x: 160, y: 60, t: 'السويتش الرئيسي', d: 'لما تقفله، الـ 9V بتفصل والـ 100k بيشدّوا البوابات للأرضي: الكشافين يطفوا حتى لو الفيوزات لسه موصّلة.' }
    ]
  }
]

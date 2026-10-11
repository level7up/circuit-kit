import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, battery, label, led5, scene, wire } from '../../lib/scene/draw'
import { nets } from './board'

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
    say: 'كل كشاف ليه <b>فيوز 2A لوحده</b> من الـ + ، والـ − بتاعه بس اللي رايح للبورد. الدايرة نفسها من <b>فيوز 1A + السويتش</b>.',
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
      { x: 160, y: 60, t: 'السويتش', d: 'لما تقفله، الـ 9V بتفصل والـ 100k بيشدّوا البوابات للأرضي: الكشافين يطفوا حتى لو الفيوزات لسه موصّلة.' }
    ]
  }
]

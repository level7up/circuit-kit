import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, arrow, battery, label, meter, scene, wire, type Pt } from '../../lib/scene/draw'

const MODULE_IN: Pt = [300, 150]
const MODULE_GND: Pt = [300, 190]

function usbModule(x: number, y: number, lit: boolean, title = 'موديول USB'): string {
  return `<rect x="${x}" y="${y}" width="170" height="80" rx="8" fill="#1f6f3a" stroke="#0f3d20" stroke-width="2"/>` +
    `<rect x="${x + 120}" y="${y + 10}" width="44" height="24" rx="3" fill="#cfd8e3"/><rect x="${x + 120}" y="${y + 46}" width="44" height="24" rx="3" fill="#cfd8e3"/>` +
    `<circle cx="${x + 100}" cy="${y + 40}" r="6" fill="${lit ? '#5aa9ff' : '#2a3242'}"/>` +
    label(x + 55, y + 30, title, { size: 12 }) + label(x + 14, y + 50, 'IN+', { size: 11, color: COLORS.amber, anchor: 'start' }) +
    label(x + 14, y + 72, 'IN−', { size: 11, color: COLORS.amber, anchor: 'start' })
}

function lm2596(x: number, y: number, reading: string): string {
  return `<rect x="${x}" y="${y}" width="170" height="80" rx="8" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2"/>` +
    `<rect x="${x + 70}" y="${y + 12}" width="30" height="30" rx="3" fill="#2563eb" stroke="#e7ecf5"/><circle cx="${x + 85}" cy="${y + 27}" r="8" fill="#f2c94c"/>` +
    label(x + 85, y + 64, 'LM2596', { size: 12 }) + label(x + 14, y + 26, 'IN', { size: 11, color: COLORS.amber, anchor: 'start' }) +
    label(x + 156, y + 26, 'OUT', { size: 11, color: COLORS.amber, anchor: 'end' }) + label(x + 85, y - 8, reading, { size: 13, color: COLORS.ok })
}

const benchModule = (lit: boolean, reading: string) => scene(
  adapter(40, 40, MODULE_IN, MODULE_GND), usbModule(300, 130, lit),
  meter(500, 150, reading, [484, 152], [484, 188])
)

export const moduleTestScene: SceneFrame[] = [
  {
    say: 'قبل أي لحام: جرّب <b>الموديول لوحده</b> على أدابتر الراوتر. + على <b>IN+</b> و− على <b>IN−</b>.',
    svg: benchModule(true, '5.1V'),
    spots: [
      { x: 330, y: 115, t: 'IN+ وIN−', d: 'مكتوبين على الموديول جنب نقط اللحام أو المسامير. لو مكتوب VIN وGND، نفس الحكاية.' },
      { x: 535, y: 140, t: 'قيس الـ USB', d: 'الأحمر في أول رجل من فتحة الـ USB والأسود في آخر رجل (أو قيس على كابل مقطوع): لازم <b>5.0–5.2V</b>.' }
    ]
  },
  {
    say: 'ركّب موبايل في كل مخرج: اللمبة الزرقا منوّرة والموبايلين بيقولوا <b>بيشحن</b>.',
    svg: benchModule(true, '5.0V'),
    spots: [{ x: 400, y: 230, t: 'لو بيشحن ببطء', d: 'الموبايل بيسأل الشاحن "انت بتدّي كام؟" عن طريق رجلين الداتا. لو مش فاهمه بيشحن على 0.5–1A بس. ده طبيعي في موديولات كتير.' }]
  }
]

export const lm2596Scene: SceneFrame[] = [
  {
    say: '<b>قبل أي موبايل:</b> وصّل الأدابتر على IN، والملتيميتر على OUT، ولف <b>التريمر</b> بمفك لحد ما يقرا <b>5.1V</b>.',
    svg: scene(adapter(40, 40, MODULE_IN, MODULE_GND), lm2596(300, 130, '← لف لحد 5.1V'), meter(500, 150, '5.1V', [484, 152], [484, 188])),
    spots: [{ x: 385, y: 157, t: 'التريمر', d: 'المسمار الصغير على العلبة الزرقا. بيبقى جاي على 12V أو أكتر: لو وصّلت موبايل قبل ما تظبطه هيتحرق. لفّه عكس عقارب الساعة يقلّ الجهد.' }]
  },
  {
    say: 'لحّم <b>مخرج USB أنثى</b> على OUT: رجل 1 (+5V) ورجل 4 (GND)، ووصّل <b>رجل 2 و3</b> ببعض.',
    svg: scene(
      lm2596(60, 130, ''),
      `<rect x="370" y="130" width="130" height="80" rx="6" fill="#cfd8e3" stroke="#8a96a8" stroke-width="2"/><rect x="390" y="150" width="90" height="26" rx="2" fill="#1b2333"/>`,
      ...[0, 1, 2, 3].map(i => `<rect x="${395 + i * 22}" y="210" width="8" height="26" fill="#d0a24a"/>` + label(399 + i * 22, 254, String(i + 1), { size: 12 })),
      wire([[230, 160], [300, 160], [300, 280], [399, 280], [399, 236]], COLORS.plus, 3),
      wire([[230, 190], [280, 190], [280, 300], [465, 300], [465, 236]], '#2b2b2b', 3),
      wire([[421, 244], [443, 244]], COLORS.orange, 3)
    ),
    spots: [
      { x: 540, y: 250, t: 'رجل 1 و4', d: 'الطرفين: 1 = +5V و4 = الأرضي. بص على الفتحة من قدام، الرجل 1 على الشمال.' },
      { x: 432, y: 110, t: 'رجل 2 و3 ببعض', d: 'D− وD+ موصّلين ببعض: كده موبايلات الأندرويد بتفهم إنه شاحن حيطة وتشحن أسرع (لحد 1.5A تقريباً).' }
    ]
  }
]

export const boardScene: SceneFrame[] = [
  {
    say: 'البورد الصغير: <b>D1</b> ضد عكس السلوك، و<b>D2</b> ضد النبضات، و<b>C1 وC2</b> لتثبيت الجهد. والفولتميتر <b>قبل</b> الدايود.',
    svg: scene(
      wire([[40, 90], [560, 90]], COLORS.plus, 3), label(40, 78, 'IN ← فيوز 3A ← ACC', { size: 12, anchor: 'start', color: COLORS.plus }),
      `<path d="M190 74 L222 90 L190 106 Z" fill="#e7ecf5"/><rect x="222" y="74" width="5" height="32" fill="#9aa6bd"/>`, label(206, 130, 'D1 · 1N5408', { size: 12 }),
      wire([[300, 90], [300, 260]], COLORS.orange, 2), label(316, 180, 'D2', { size: 12, anchor: 'start' }),
      wire([[380, 90], [380, 260]], COLORS.orange, 2), label(396, 180, 'C1 · C2', { size: 12, anchor: 'start' }),
      wire([[120, 90], [120, 170]], '#ff9a9a', 2), `<rect x="80" y="170" width="80" height="40" rx="4" fill="#050608" stroke="#4a5263"/>`, label(120, 198, '12.6', { size: 18, color: '#ff4d4d' }),
      wire([[40, 260], [560, 260]], '#2b2b2b', 3), label(40, 284, 'GND ← الشاسيه', { size: 12, anchor: 'start', color: COLORS.muted }),
      `<rect x="470" y="110" width="90" height="60" rx="6" fill="#1f6f3a"/>`, label(515, 145, 'الموديول', { size: 12 })
    ),
    spots: [
      { x: 206, y: 60, t: 'ليه 1N5408؟', d: 'الموبايلين بيسحبوا حوالي 1.5A من البطارية. الـ 1N4007 بتاع الكيتات التانية 1A بس، فكان هيسخن ويتحرق.' },
      { x: 120, y: 225, t: 'الفولتميتر قبل الدايود', d: 'كده بيقرا جهد البطارية بالظبط، مش أقل منه بـ 0.8V.' }
    ]
  }
]

export const accScene: SceneFrame[] = [
  {
    say: 'افصل سالب البطارية، وبعدين دوّر على سلك <b>ACC</b>: <b>12V والمفتاح مفتوح</b>، و<b>0V والمفتاح مقفول</b>. أسهل مكان: ورا الولاعة.',
    svg: scene(meter(130, 40, '12.4V'), meter(390, 40, '0.0V'), label(165, 190, 'المفتاح مفتوح', { color: COLORS.ok }), label(425, 190, 'المفتاح مقفول', { color: COLORS.muted }),
      wire([[60, 260], [540, 260]], COLORS.orange, 6), label(300, 300, 'سلك الكونتاكت (ACC)', { size: 13 })),
    spots: [{ x: 300, y: 230, t: 'ليه ACC؟', d: 'لو أخدت من البطارية على طول، الموديول والفولتميتر هيسحبوا حوالي 20mA طول الوقت، وده ممكن يفضّي البطارية في أسبوعين.' }]
  },
  {
    say: '<b>فيوز 3A</b> في أول السلك الأحمر، قريب من الـ Tap. والأسود على <b>مسمار شاسيه</b> نضيف.',
    svg: scene(battery(40, 170), wire([[60, 90], [560, 90]], COLORS.orange, 6),
      `<rect x="250" y="78" width="30" height="24" rx="4" fill="#3b82f6"/>`, wire([[265, 102], [265, 170], [320, 170]], COLORS.plus, 4),
      `<rect x="320" y="158" width="56" height="24" rx="5" fill="#2a1414" stroke="${COLORS.plus}" stroke-width="2"/>`, label(348, 175, '3A', { size: 13, color: '#ff9a9a' }),
      wire([[376, 170], [450, 170]], COLORS.plus, 4), `<rect x="450" y="150" width="90" height="50" rx="6" fill="#c9a76a"/>`, label(495, 180, 'البورد', { size: 12, color: '#1b2333' }),
      arrow([348, 240], [348, 190])),
    spots: [{ x: 348, y: 255, t: 'الفيوز الأول', d: 'أقرب حاجة للـ Tap. لو حصل قصر في أي حتة بعده، الفيوز يتحرق بدل السلك.' }]
  }
]

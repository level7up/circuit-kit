import type { SceneFrame } from '../../types/circuit'
import { COLORS, arrow, label, meter, ringGlyph, scene, wire, type Pt } from '../../lib/scene/draw'

const LOCK_GREEN = '#22c55e'
const UNLOCK_PURPLE = '#a855f7'
const GATE_BLUE = '#5aa9ff'
const PARKING_YELLOW = '#f5c518'
const BOARD_FILL = '#c9a76a'

function box(x: number, y: number, w: number, h: number, text: string, fill = BOARD_FILL): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#8a6b30" stroke-width="2"/>` +
    label(x + w / 2, y + h / 2 + 5, text, { size: 13, color: '#1b2333' })
}

function mosfet(x: number, y: number, on: boolean): string {
  const legs = [['G', 0], ['D', 1], ['S', 2]] as const
  return `<rect x="${x}" y="${y - 22}" width="96" height="16" rx="3" fill="#c4ccd6"/><circle cx="${x + 48}" cy="${y - 14}" r="5" fill="#0b0f17"/>` +
    `<rect x="${x}" y="${y - 8}" width="96" height="64" rx="4" fill="#1b1b1b" stroke="${on ? COLORS.ok : '#555'}" stroke-width="2"/>` +
    label(x + 48, y + 30, 'IRF9540N', { size: 11, color: '#cbd5ea' }) +
    legs.map(([t, k]) => `<line x1="${x + 18 + k * 30}" y1="${y + 56}" x2="${x + 18 + k * 30}" y2="${y + 84}" stroke="#b8c0cc" stroke-width="3"/>` +
      label(x + 28 + k * 30, y + 76, t, { size: 12, color: COLORS.amber })).join('')
}

function pulseGraph(x: number, y: number, w: number, h: number, upTo: number): string {
  const decay = (t: number) => Math.exp(-t / 2.2)
  const points: Pt[] = Array.from({ length: 41 }, (_, i): Pt => {
    const t = (i / 40) * 8
    const v = t < 0.3 ? t / 0.3 : decay(t - 0.3)
    return [x + (t / 8) * w, y + h - v * h * 0.9]
  }).filter(p => p[0] <= x + upTo * w)
  const line = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const threshold = y + h - 0.39 * h * 0.9
  const offAt = x + ((0.3 + 2.2 * Math.log(1 / 0.39)) / 8) * w
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111827" stroke="#2a3242"/>` +
    `<line x1="${x}" y1="${threshold}" x2="${x + w}" y2="${threshold}" stroke="${COLORS.bad}" stroke-dasharray="5 4"/>` +
    label(x + w - 4, threshold - 6, 'حد الإطفاء', { size: 11, color: COLORS.bad, anchor: 'end' }) +
    `<path d="${line}" fill="none" stroke="#7dd3fc" stroke-width="3"/>` +
    `<rect x="${x}" y="${y + h + 8}" width="${Math.max(0, Math.min(offAt, x + upTo * w) - x)}" height="12" rx="3" fill="${COLORS.amber}"/>` +
    label(x, y + h + 40, 'الحلقتين منوّرين', { size: 12, color: COLORS.amber, anchor: 'start' }) +
    label(x + w / 2, y - 8, 'جهد المكثف C9', { size: 12, color: '#7dd3fc' })
}

export const welcomeIdeaScene: SceneFrame[] = [
  {
    say: 'لما تدوس <b>قفل</b> على الريموت، علبة السنتر لوك بتبعت <b>12V لمدة نص ثانية</b> على سلك القفل للمواتير. ولما تفتح، على سلك الفتح.',
    svg: scene(
      box(40, 120, 130, 80, 'علبة السنتر لوك', '#1d2230'),
      wire([[170, 140], [560, 140]], LOCK_GREEN, 5), wire([[170, 180], [560, 180]], UNLOCK_PURPLE, 5),
      label(560, 128, 'سلك القفل', { size: 12, anchor: 'end', color: LOCK_GREEN }), label(560, 206, 'سلك الفتح', { size: 12, anchor: 'end', color: UNLOCK_PURPLE }),
      meter(360, 210, '12.4V', [380, 140]), label(470, 290, 'نص ثانية بس', { size: 13, color: COLORS.amber })
    ),
    spots: [
      { x: 105, y: 100, t: 'علبة السنتر لوك', d: 'لو السنتر لوك تركيب برّه (بريموت)، العلبة بتبقى تحت الطبلون جنب رجل السواق، وسلوكها خارجة لكل باب.' },
      { x: 300, y: 160, t: 'سلكين', d: 'وهي ساكنة الاتنين <b>0V</b>. القفل بيطلّع 12V على واحد، والفتح على التاني. البورد بياخد الاتنين.' }
    ]
  },
  {
    say: 'النبضة بتملا <b>C9 100µF</b> في لحظة، وبعدين <b>R13 56k</b> بتفضّيه على مهلها. طول ما الجهد فوق الخط، الـ CD40106 فاتح الموسفت: <b>حوالي 5 ثواني</b>.',
    svg: scene(pulseGraph(80, 70, 440, 170, 1)),
    spots: [
      { x: 100, y: 90, t: 'النبضة', d: 'نص ثانية بس على سلك القفل، بس كفاية تملا المكثف لآخره عن طريق D5 وR12 1k.' },
      { x: 300, y: 165, t: 'التفضية', d: 'المكثف بيفضى في R13. المدة ≈ R13 × C9: لو عايزها أطول حط 100k (حوالي 9 ثواني).' },
      { x: 420, y: 262, t: 'الـ CD40106', d: 'شريحة Schmitt: بتقلب مرة واحدة بالظبط لما الجهد ينزل تحت الخط، فالحلقتين بيطفوا مرة واحدة مش بيبهتوا.' }
    ]
  },
  {
    say: 'رجل 2 في الـ CD40106 بتنزل <b>0V</b> طول الـ 5 ثواني، وده بيفتح <b>الموسفت IRF9540N</b>. الموسفت بيوصّل البطارية للسلك الأحمر بتاع بورد الحلقتين. من غير ريلاي ومن غير صوت.',
    svg: scene(
      box(30, 150, 130, 70, 'تايمر CD40106'), mosfet(250, 110, true),
      wire([[160, 185], [268, 185], [268, 194]], GATE_BLUE, 3), label(212, 176, 'رجل 2: صفر', { size: 11, color: GATE_BLUE }),
      wire([[520, 50], [328, 50], [328, 194]], COLORS.plus, 4), label(530, 42, '+12V من البطارية', { size: 12, anchor: 'end', color: COLORS.plus }),
      wire([[298, 194], [298, 260], [380, 260]], PARKING_YELLOW, 4), box(380, 235, 110, 50, 'بورد الحلقتين'),
      ringGlyph(540, 260, 26)
    ),
    spots: [
      { x: 236, y: 222, t: 'G (البوابة)', d: 'لما رجل 2 تبقى 0V والـ S على 12V، الموسفت بيفتح على الآخر. ولما رجل 2 ترجع 12V بيقفل مرة واحدة.' },
      { x: 360, y: 120, t: 'S (المصدر)', d: 'واصلة بخط +12V على البورد. الحلقتين بيسحبوا حوالي 0.26A، والموسفت بيسخن أقل من 0.01 وات: مش محتاج مشتت.' },
      { x: 330, y: 290, t: 'D (الخارج)', d: 'السلك الأصفر (OUT) من هنا للسلك الأحمر بتاع بورد الحلقتين.' }
    ]
  }
]

export const welcomeCarScene: SceneFrame[] = [
  {
    say: 'افصل سالب البطارية، ودوّر على سلكين القفل والفتح بالملتيميتر: <b>0V</b> وهي ساكنة، و<b>12V لحظة</b> وانت بتقفل أو بتفتح.',
    svg: scene(
      meter(120, 40, '0.0V'), meter(400, 40, '12.4V'),
      label(155, 190, 'ساكنة', { color: COLORS.muted }), label(435, 190, 'وانت بتقفل', { color: COLORS.ok }),
      wire([[60, 250], [540, 250]], LOCK_GREEN, 6), label(300, 290, 'سلك القفل', { size: 13, color: LOCK_GREEN })
    ),
    spots: [{ x: 300, y: 220, t: 'جرّب الاتنين', d: 'علّم السلك اللي بيطلّع 12V مع القفل بشريط أخضر، واللي مع الفتح بشريط بنفسجي. قيس وصاحبك بيدوس على الريموت.' }]
  },
  {
    say: 'وصّل: <b>LOCK</b> و<b>UNLOCK</b> بـ Tap على السلكين، و<b>BAT+</b> من البطارية بفيوز 1A، و<b>OUT</b> (الأصفر) على السلك الأحمر بتاع الحلقتين.',
    svg: scene(
      box(90, 150, 170, 80, 'بورد الترحيب'),
      wire([[20, 80], [150, 80], [150, 150]], LOCK_GREEN, 3), wire([[20, 110], [120, 110], [120, 150]], UNLOCK_PURPLE, 3),
      label(20, 70, 'LOCK', { size: 12, anchor: 'start', color: LOCK_GREEN }), label(20, 132, 'UNLOCK', { size: 12, anchor: 'start', color: UNLOCK_PURPLE }),
      wire([[560, 60], [230, 60], [230, 150]], COLORS.plus, 4), label(560, 50, 'البطارية + فيوز 1A', { size: 12, anchor: 'end', color: COLORS.plus }),
      wire([[260, 200], [440, 200], [440, 250]], PARKING_YELLOW, 4), label(350, 190, 'OUT', { size: 12, color: PARKING_YELLOW }), box(390, 250, 110, 50, 'بورد الحلقتين')
    ),
    spots: [
      { x: 150, y: 50, t: 'LOCK وUNLOCK', d: 'Tap على كل سلك من غير ما تقطعه. السنتر لوك يفضل شغال عادي.' },
      { x: 400, y: 80, t: 'من البطارية على طول', d: 'مش من سلك الركن: الترحيب لازم يشتغل والعربية مطفية. البورد بيسحب أقل من 1mA وهو مستني، فمش هيفضّي البطارية.' }
    ]
  },
  {
    say: '<b>D7</b> في سلك الركن قبل السلك الأحمر: الشريطة ناحية الأحمر. من غيره الترحيب هيرجّع كهربا في سلك الركن ولمبات الركن هتنوّر معاه.',
    svg: scene(
      wire([[40, 120], [250, 120]], PARKING_YELLOW, 5), label(40, 108, 'سلك الركن (بعد الفيوز)', { size: 12, anchor: 'start', color: PARKING_YELLOW }),
      `<path d="M250 104 L282 120 L250 136 Z" fill="#e7ecf5"/><rect x="282" y="104" width="5" height="32" fill="#9aa6bd"/>`, label(268, 160, 'D7', { size: 13 }),
      wire([[287, 120], [430, 120]], COLORS.plus, 5), wire([[360, 260], [360, 120]], PARKING_YELLOW, 4), label(360, 285, 'من OUT في بورد الترحيب', { size: 12, color: COLORS.plus }),
      box(430, 95, 120, 50, 'IN (الأحمر)'), arrow([180, 200], [262, 136])
    ),
    spots: [{ x: 268, y: 92, t: 'اتجاه D7', d: 'الشريطة ناحية بورد الحلقتين. الركن يقدر يولّع الحلقتين، بس الترحيب مايقدرش يرجع على لمبات الركن.' }]
  }
]

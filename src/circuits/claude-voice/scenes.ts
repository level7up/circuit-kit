import type { SceneFrame } from '../../types/circuit'
import { COLORS, label, scene, wire } from '../../lib/scene/draw'

const GPIO4 = '#4ade80'
const GPIO5 = '#f87171'
const GPIO6 = '#ffb547'
const GND = '#9aa6bd'

const devkit = (x: number, y: number): string =>
  `<rect x="${x}" y="${y}" width="90" height="230" rx="6" fill="#0f766e" stroke="#134e4a" stroke-width="2"/>` +
  label(x + 45, y + 120, 'ESP32-S3', { size: 13 }) +
  `<rect x="${x + 30}" y="${y + 222}" width="30" height="16" rx="3" fill="#9aa6bd"/>` +
  label(x - 6, y + 46, 'GPIO4', { size: 11, color: GPIO4, anchor: 'end' }) +
  label(x - 6, y + 66, 'GPIO5', { size: 11, color: GPIO5, anchor: 'end' }) +
  label(x - 6, y + 86, 'GPIO6', { size: 11, color: GPIO6, anchor: 'end' }) +
  label(x - 6, y + 206, 'GND', { size: 11, color: GND, anchor: 'end' })

const pushButton = (x: number, y: number, name: string, color: string): string =>
  `<rect x="${x - 18}" y="${y - 18}" width="36" height="36" rx="4" fill="#20252f" stroke="#566179" stroke-width="2"/>` +
  `<circle cx="${x}" cy="${y}" r="11" fill="${color}"/>` + label(x, y + 36, name, { size: 12 })

const ledWithResistor = (x: number, y: number): string =>
  `<circle cx="${x}" cy="${y}" r="12" fill="${GPIO6}" stroke="#7c4a03" stroke-width="2"/>` +
  label(x, y - 20, 'LED', { size: 11, color: COLORS.muted }) +
  `<rect x="${x + 36}" y="${y - 6}" width="44" height="12" rx="5" fill="#d9c7a3" stroke="#6b5531"/>` +
  label(x + 58, y - 12, '330Ω', { size: 11, color: COLORS.muted })

export const buttonScene: SceneFrame[] = [
  {
    say: 'زرار الكلام: رجل على <b>GPIO4</b> والتانية على <b>GND</b>. مفيش مقاومة: الكود بيشغّل الـ <b>Pull-up</b> اللي جوه الـ ESP32، فالرجل عليها 3.3V والزرار سايب، و0V وهو مضغوط.',
    svg: scene(
      devkit(420, 50),
      pushButton(150, 110, 'زرار الكلام', '#16a34a'),
      wire([[168, 100], [300, 100], [300, 96], [414, 96]], GPIO4, 3),
      wire([[150, 128], [150, 260], [414, 256]], GND, 3)
    ),
    spots: [
      { x: 150, y: 110, t: 'زرار 4 رجول؟', d: 'الرجلين اللي جنب بعض في نفس الناحية ممكن يكونوا متوصّلين على طول. استخدم رجلين <b>قطريين</b>، أو جرّب بالملتيميتر على الصفارة.' },
      { x: 300, y: 98, t: 'ليه GPIO4؟', d: 'رجل عادية مش Strapping. GPIO0 وGPIO3 وGPIO45 وGPIO46 بيأثروا على طريقة الإقلاع: متستخدمهمش للزرار.' }
    ]
  },
  {
    say: 'بعد ما البرنامج يشتغل: زرار <b>Cancel</b> على <b>GPIO5</b> بنفس الطريقة، و<b>LED</b> على <b>GPIO6</b> من خلال مقاومة <b>330Ω</b> (تيار حوالي 4 mA).',
    svg: scene(
      devkit(420, 50),
      pushButton(150, 110, 'زرار الكلام', '#16a34a'),
      wire([[168, 100], [300, 100], [300, 96], [414, 96]], GPIO4, 3),
      pushButton(150, 190, 'Cancel', '#dc2626'),
      wire([[168, 180], [320, 180], [320, 116], [414, 116]], GPIO5, 3),
      ledWithResistor(240, 240),
      wire([[252, 240], [276, 240]], GPIO6, 2),
      wire([[320, 240], [396, 240], [396, 136], [414, 136]], GPIO6, 3),
      wire([[150, 128], [110, 128], [110, 280], [414, 280], [414, 256]], GND, 3),
      wire([[150, 208], [150, 280]], GND, 3),
      wire([[228, 240], [210, 240], [210, 280]], GND, 3),
      label(206, 296, 'GND مشترك', { size: 11, color: GND })
    ),
    spots: [
      { x: 240, y: 240, t: 'اتجاه الـ LED', d: 'الرجل الطويلة ناحية المقاومة (رايحة GPIO6)، والقصيرة على GND.' }
    ]
  }
]

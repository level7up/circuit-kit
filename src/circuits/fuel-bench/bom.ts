import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'
const BOARDS = 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/'

export const bom: BomRow[] = [
  { g: '🧠 المتحكم' },
  { n: 'Arduino Nano', s: 'ATmega328P · CH340 (U1) · يفضّل بالـ Bootloader الجديد', q: 1, p: 350, est: 1, on: 1 },
  { n: 'هيدر أنثى', s: 'Female Header 1×40 (هتقص منه 2 × 15)', q: 1, p: 10, est: 1, on: 1 },
  { n: 'شاشة', s: 'LCD 1602 + موديول I2C (عنوان 0x27 أو 0x3F)', q: 1, p: 150, est: 1, on: 1 },
  { g: '🛡️ الحماية (البورد)' },
  { n: 'دايود 3A', s: '1N5408 · D1', q: 1, p: 2, est: 1, on: 1 },
  { n: 'دايود حماية TVS', s: 'P6KE18A · D2', q: 1, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 1 },
  { n: 'مكثف كيميائي', s: '100µF / 50V · C1', q: 1, p: 1.5, u: MK + 'capacitor-100uf-50v-6x12mm', on: 1 },
  { n: 'مكثف سيراميك', s: '100nF (104) · C2 C3', q: 2, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 1 },
  { g: '📏 الدخول والإحساس' },
  { n: 'مقاومة', s: '1kΩ ¼W · R1 R8 R9', q: 3, p: 0.15, u: MK + 'carbon-resistor-1k%cf%89-0-25w/', on: 1 },
  { n: 'مقاومة', s: '100kΩ ¼W · R2 R3 R11', q: 3, p: 0.15, u: MK + 'carbon-resistor-100k-0-25w/', on: 1 },
  { n: 'مقاومة', s: '47kΩ ¼W · R4 R6', q: 2, p: 0.15, u: MK + 'carbon-resistor-47k%cf%89-0-25w/', on: 1 },
  { n: 'مقاومة', s: '10kΩ ¼W · R5 R7', q: 2, p: 0.15, u: MK + '2pcs-carbon-resistor-10k%cf%89-0-25w-thr/', on: 1 },
  { g: '⚡ الخرج' },
  { n: 'موسفت N', s: 'IRLZ44N – TO-220 · Q1 (Logic-level)', q: 1, p: 40, u: MK + 'irlz44-n-channel-mosfet-transistor/', on: 1 },
  { n: 'مقاومة', s: '220Ω ¼W · R10', q: 1, p: 0.15, est: 1, on: 1 },
  { n: 'بورد نقط', s: 'بورد نقط 9×5 سم (هتستخدم 30 × 18 خرم)', q: 1, p: 25, est: 1, u: BOARDS, on: 1 },
  { g: '🎛️ اللوحة' },
  { n: 'بوتنشيومتر', s: '10kΩ خطي (B10K) · محاكي الحساس', q: 1, p: 10, est: 1, on: 1 },
  { n: 'بوتنشيومتر', s: '10kΩ خطي (B10K) · المقبض', q: 1, p: 10, est: 1, on: 1 },
  { n: 'زرار', s: 'Push Button 12 مم (بيرجع لوحده) · تشغيل / Reset', q: 1, p: 10, est: 1, on: 1 },
  { n: 'سويتش', s: 'KCD4 Rocker ON-OFF · S1 (بيقطع كهربا اللمبة بإيده)', q: 1, p: 20, u: MK + 'kcd4-rocker-switch-1-momentary/', on: 1 },
  { n: 'LED', s: '5 مم أخضر (شغال) + أحمر (عطل)', q: 2, p: 0.5, est: 1, on: 1 },
  { g: '🔌 المكتب (مش محسوب)' },
  { n: 'أدابتر', s: '12V 2A (أدابتر راوتر أو شريط LED)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'حامل فيوز', s: 'حامل فيوز سلك + فيوز 2A', q: 1, p: 0, car: 1, on: 0 },
  { n: 'لمبة الحمل', s: 'لمبة عربية 12V 5W (W5W/T10) بالدوّاية: هي "الطرمبة"', q: 1, p: 0, car: 1, on: 0 },
  { n: 'سلك', s: 'سلك 1 مم أحمر وأسود + سلك رفيع للوحة', q: 1, p: 0, car: 1, on: 0 }
]

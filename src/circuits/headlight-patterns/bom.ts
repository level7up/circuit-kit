import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'

export const bom: BomRow[] = [
  { g: 'الحماية والـ 9V' },
  { n: 'دايود', s: '1N4007 · D1 (عكس السلوك)', q: 1, p: 0.5, u: MK + '1n4007-diode-1a-1-1v1a-1kv-do-41/', on: 1 },
  { n: 'دايود حماية TVS', s: 'P6KE18A · D2', q: 1, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 1 },
  { n: 'منظم جهد', s: 'LM7809 – TO-220 · U1', q: 1, p: 6, est: 1, u: MK + 'regelator-7809/', on: 1 },
  { n: 'مكثف كيميائي', s: '100µF / 50V · C1 C3', q: 2, p: 1.5, u: MK + 'capacitor-100uf-50v-6x12mm', on: 1 },
  { n: 'مكثف سيراميك', s: '100nF (104) · C2 C5', q: 2, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 1 },
  { g: 'الساعة والعدّاد' },
  { n: 'CD40106', s: 'CD40106BE – DIP-14 · U2 (الساعة)', q: 1, p: 8, u: MK + '40106-ic-cmos-hex-schmitt-triggers/', on: 1 },
  { n: 'CD4017', s: 'CD4017BE – DIP-16 · U3 (العدّاد)', q: 1, p: 8, est: 1, on: 1 },
  { n: 'قاعدة IC', s: 'IC Socket 14 Pin', q: 1, p: 1.25, u: MK + 'ic-socket-77-base-14-pin/', on: 1 },
  { n: 'قاعدة IC', s: 'IC Socket 16 Pin', q: 1, p: 1.5, est: 1, on: 1 },
  { n: 'مكثف كيميائي', s: '1µF / 50V · C4 (الساعة)', q: 1, p: 0.5, u: MK + 'capacitor-1uf-50v-11mm-x-5mm/', on: 1 },
  { n: 'مقاومة', s: '100kΩ ¼W · R1 R3 R6 R7', q: 4, p: 0.15, u: MK + 'carbon-resistor-100k-0-25w/', on: 1 },
  { g: 'الأشكال والخرج' },
  { n: 'دايود إشارة', s: '1N4148 · الـ 16 دايود (DA1 لـ DE4)', q: 16, p: 0.5, u: MK + '1n4148-diode-fast-switch', on: 1 },
  { n: 'سويتش دوّار', s: 'RS16 Rotary 2 Pole × 4 Position (الأشكال)', q: 1, p: 40, u: MK + 'rs16-switch-2-pole-4-position-15mm/', on: 1 },
  { n: 'موسفت N', s: 'IRLZ44N – TO-220 · Q1 Q2 (Logic-level)', q: 2, p: 40, u: MK + 'irlz44-n-channel-mosfet-transistor/', on: 1 },
  { n: 'مقاومة', s: '1kΩ ¼W · R4 R5', q: 2, p: 0.15, u: MK + 'carbon-resistor-1k%cf%89-0-25w/', on: 1 },
  { n: 'بورد نقط', s: 'بورد نقط 7×9 سم (هتستخدم 30 × 21 خرم)', q: 1, p: 30, est: 1, u: 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/', on: 1 },
  { n: 'سويتش رئيسي', s: 'Rocker Switch ON-OFF (التشغيل)', q: 1, p: 8, est: 1, u: MK + 'rocker-switch-spdt-2-position-on-off/', on: 1 },
  { g: 'للتجربة على المكتب' },
  { n: 'LED', s: 'LED 5 مم أبيض أو أحمر (لمبتين بيان)', q: 2, p: 0.5, est: 1, on: 0 },
  { n: 'مقاومة', s: '1kΩ ¼W (مع اللمبتين البيان)', q: 2, p: 0.15, u: MK + 'carbon-resistor-1k%cf%89-0-25w/', on: 0 },
  { g: 'اختياري' },
  { n: 'سويتش دوّار بديل', s: 'Rotary 2P6T (أرخص، وتظبط الحلقة على 4)', q: 1, p: 18, u: MK + 'rotary-switch-2-pole-6-position-2p6t/', on: 0 },
  { g: 'من محل قطع غيار العربيات (مش محسوب)' },
  { n: 'كشاف LED', s: 'كشافين LED 12V صغيرين (لحد 18 وات = 1.5A لكل واحد)', q: 2, p: 0, car: 1, on: 0 },
  { n: 'حامل فيوز', s: '3 حوامل فيوز: 1A للدايرة + 2A لكل كشاف', q: 3, p: 0, car: 1, on: 0 },
  { n: 'سلك', s: 'سلك 1.5 مم للكشافات والأرضي + كابل 7 سلوك رفيع للسويتش الدوّار', q: 1, p: 0, car: 1, on: 0 },
  { n: 'علبة', s: 'علبة بلاستيك + مسامير للموسفتات', q: 1, p: 0, car: 1, on: 0 }
]

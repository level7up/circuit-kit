import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'
const BOARDS = 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/'

export const bom: BomRow[] = [
  { g: 'الحماية (البورد)' },
  { n: 'دايود 3A', s: '1N5408 · D1 (مش 1N4007: ده 1A بس)', q: 1, p: 2, est: 1, on: 1 },
  { n: 'دايود حماية TVS', s: 'P6KE18A · D2', q: 1, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 1 },
  { n: 'مكثف سيراميك', s: '100nF (104) / 50V · C1', q: 1, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 1 },
  { n: 'مكثف كيميائي', s: '100µF / 50V · C2', q: 1, p: 1.5, u: MK + 'capacitor-100uf-50v-6x12mm', on: 1 },
  { n: 'بورد نقط', s: 'حتة 14 × 4 خرم', q: 1, p: 10, est: 1, u: BOARDS, on: 1 },
  { g: '🔌 الشاحن (الأصلي)' },
  { n: 'موديول USB', s: 'Step Down 6–40V → 5V 3A بمخرجين USB', q: 1, p: 120, est: 1, u: MK + 'step-down-module-9v-12v-24v-to-5v-3a/', on: 1 },
  { n: 'فولتميتر', s: 'Mini Digital Voltmeter سلكين 0.28" (2.5–40V)', q: 1, p: 60, est: 1, on: 1 },
  { g: '🔧 لو الموديول مش موجود: LM2596 + مخرج USB' },
  { n: 'موديول LM2596', s: 'LM2596 Step Down (بالتريمر الأزرق)', q: 1, p: 60, est: 1, on: 0 },
  { n: 'مخرج USB', s: 'USB-A Female (فيشة أنثى) بتتلحم', q: 1, p: 5, est: 1, on: 0 },
  { g: 'اختياري' },
  { n: 'سويتش', s: 'KCD4 Rocker Switch ON-OFF · عشان تطفيه من غير المفتاح', q: 1, p: 20, u: MK + 'kcd4-rocker-switch-1-momentary/', on: 0 },
  { g: 'من محل قطع غيار العربيات (مش محسوب)' },
  { n: 'حامل فيوز', s: 'حامل فيوز خارجي + فيوز 3A', q: 1, p: 0, car: 1, on: 0 },
  { n: 'وصلة تفريع', s: 'Tap connector على سلك الكونتاكت (ACC)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'سلك', s: 'سلك 1 مم أحمر وأسود (2 متر)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'علبة', s: 'علبة بلاستيك صغيرة أو غطا زرار فاضي في الطبلون', q: 1, p: 0, car: 1, on: 0 }
]

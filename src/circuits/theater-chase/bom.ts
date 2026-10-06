import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'

export const bom: BomRow[] = [
  { g: 'الدايرة' },
  { n: 'CD40106', s: 'CD40106BE – DIP-14 (الساعة)', q: 1, p: 8, u: MK + '40106-ic-cmos-hex-schmitt-triggers/', on: 1 },
  { n: 'CD4017', s: 'CD4017BE – DIP-16 (العدّاد)', q: 1, p: 8, est: 1, on: 1 },
  { n: 'قاعدة IC', s: 'IC Socket 14 Pin', q: 1, p: 1.25, u: MK + 'ic-socket-77-base-14-pin/', on: 1 },
  { n: 'قاعدة IC', s: 'IC Socket 16 Pin', q: 1, p: 1.5, est: 1, on: 1 },
  { n: 'ترانزستور', s: '2N2222A – TO-92 (مش BC547)', q: 3, p: 1, est: 1, on: 1 },
  { n: 'منظم جهد', s: 'LM7805 – TO-220', q: 1, p: 5, u: MK + 'positive-voltage-regulator-5v-7805', on: 1 },
  { n: 'دايود', s: '1N4007', q: 1, p: 0.5, u: MK + '1n4007-diode-1a-1-1v1a-1kv-do-41/', on: 1 },
  { n: 'دايود حماية TVS', s: 'P6KE18A', q: 1, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 1 },
  { n: 'مكثف كيميائي', s: '100µF / 50V · C1', q: 1, p: 1.5, u: MK + 'capacitor-100uf-50v-6x12mm', on: 1 },
  { n: 'مكثف كيميائي', s: '1µF / 50V · C4 (الساعة)', q: 1, p: 0.5, u: MK + 'capacitor-1uf-50v-11mm-x-5mm/', on: 1 },
  { n: 'مكثف سيراميك', s: '100nF (104) · C2 C3 C7', q: 3, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 1 },
  { n: 'مقاومة', s: '100kΩ ¼W · R1 (السرعة)', q: 1, p: 0.15, u: MK + 'carbon-resistor-100k-0-25w/', on: 1 },
  { n: 'مقاومة', s: '4.7kΩ ¼W · RA RB RC', q: 3, p: 0.15, est: 1, on: 1 },
  { n: 'بورد نقط', s: 'بورد نقط 5×7 سم (26 × 18 خرم)', q: 1, p: 20, est: 1, u: 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/', on: 1 },
  { g: 'الشريط' },
  { n: 'شريط LED', s: 'شريط 12V 2835 · 60 لمبة/متر · 20 سم (12 لمبة)', q: 1, p: 10, est: 1, on: 1 },
  { n: 'سلك', s: 'سلك رفيع 5 ألوان (أصفر + بنفسجي + أخضر + برتقالي + أحمر/أسود) أو كابل نت قديم', q: 1, p: 0, car: 1, on: 0 },
  { g: 'اختياري' },
  { n: 'مقاومة متغيّرة', s: 'Trimmer 500kΩ + مقاومة 22kΩ مكان R1 (عشان تظبط السرعة بمفك)', q: 1, p: 3, est: 1, on: 0 },
  { g: 'من محل قطع غيار العربيات (مش محسوب)' },
  { n: 'حامل فيوز', s: 'حامل فيوز خارجي + فيوز 1A', q: 1, p: 0, car: 1, on: 0 },
  { n: 'علبة', s: 'علبة بلاستيك صغيرة + سيليكون', q: 1, p: 0, car: 1, on: 0 }
]

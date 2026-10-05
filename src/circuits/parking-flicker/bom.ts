import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'

export const bom: BomRow[] = [
  { g: "الدايرة الأساسية" },
  {
    n: "CD40106",
    s: "CD40106BE – DIP-14",
    q: 1,
    p: 8,
    u: MK + "40106-ic-cmos-hex-schmitt-triggers/",
    on: 1
  },
  {
    n: "قاعدة IC",
    s: "IC Socket 14 Pin (7+7)",
    q: 1,
    p: 1.25,
    u: MK + "ic-socket-77-base-14-pin/",
    on: 1
  },
  {
    n: "ترانزستور",
    s: "TIP122 – TO-220",
    q: 1,
    p: 9,
    u: MK + "tip122-5a-100v-npn-darlington-power-transistor-to-220",
    on: 1
  },
  {
    n: "منظم جهد",
    s: "LM7805 – TO-220",
    q: 1,
    p: 5,
    u: MK + "positive-voltage-regulator-5v-7805",
    on: 1
  },
  {
    n: "دايود",
    s: "1N4007",
    q: 1,
    p: 0.5,
    u: MK + "1n4007-diode-1a-1-1v1a-1kv-do-41/",
    on: 1
  },
  {
    n: "دايود حماية TVS",
    s: "P6KE18A",
    q: 1,
    p: 2,
    u: MK + "esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/",
    on: 1
  },
  {
    n: "مكثف كيميائي",
    s: "100µF / 50V",
    q: 1,
    p: 1.5,
    u: MK + "capacitor-100uf-50v-6x12mm",
    on: 1
  },
  {
    n: "مكثف سيراميك",
    s: "100nF (104) / 50V",
    q: 3,
    p: 0.5,
    u: MK + "ceramic-capacitor-100nf-50v/",
    on: 1
  },
  {
    n: "مكثف كيميائي",
    s: "1µF / 50V",
    q: 3,
    p: 0.5,
    u: MK + "capacitor-1uf-50v-11mm-x-5mm/",
    on: 1
  },
  {
    n: "مكثف كيميائي",
    s: "22µF (16V أو أكتر)",
    q: 1,
    p: 3,
    est: 1,
    u: MK + "capacitor-22uf-250v/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "1MΩ ¼W",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-1m%cf%89-0-25w/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "390kΩ ¼W",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-390k%cf%89-0-25w-through-hole/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "100kΩ ¼W",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-100k-0-25w/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "47kΩ ¼W",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-47k%cf%89-0-25w/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "22kΩ ¼W",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-22k%cf%89-0-25w-through/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "10kΩ ¼W",
    q: 2,
    p: 0.15,
    u: MK + "2pcs-carbon-resistor-10k%cf%89-0-25w-thr/",
    on: 1
  },
  {
    n: "مقاومة",
    s: "68Ω ¼W (أوم مش كيلو!) · R8 وR9 وR10",
    q: 3,
    p: 0.15,
    u: MK + "carbon-resistor-68%cf%89-0-25w-through-hole/",
    on: 1
  },
  {
    n: "بورد مثقّب",
    s: "Vero / Perfboard (12–25 جنيه)",
    q: 1,
    p: 15,
    est: 1,
    u: "https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/",
    on: 1
  },
  { g: "للتجربة على المكتب" },
  {
    n: "بريد بورد",
    s: "400 نقطة",
    q: 1,
    p: 25,
    u: MK + "breadboard-400-points/",
    on: 1
  },
  { n: "LED", s: "أصفر 5mm", q: 2, p: 0.5, u: MK + "yellow-led-5mm", on: 1 },
  {
    n: "مقاومة اختبار",
    s: "1kΩ ¼W (LED اختبار المذبذب)",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-1k%cf%89-0-25w/",
    on: 1
  },
  {
    n: "مقاومة اختبار",
    s: "470Ω ¼W (بديل اللمبة في التجربة)",
    q: 1,
    p: 0.15,
    u: MK + "carbon-resistor-470%cf%89-0-25w/",
    on: 1
  },
  { g: "اختياري" },
  {
    n: "IC احتياطي",
    s: "CD40106BE",
    q: 1,
    p: 8,
    u: MK + "40106-ic-cmos-hex-schmitt-triggers/",
    on: 0
  },
  { g: "من محل قطع غيار العربيات (مش محسوب)" },
  { n: "شريط LED", s: "شريط 12V أبيض 2835 · 20 لمبة (≈ 140mA)", q: 1, p: 0, car: 1, on: 0 },
  { n: "مشتت حراري", s: "مشتت صغير TO-220 + جلبة/مايكا عازلة للـ TIP122", q: 1, p: 0, car: 1, on: 0 },
  { n: "حامل فيوز", s: "حامل فيوز خارجي + فيوز 1A", q: 1, p: 0, car: 1, on: 0 },
  { n: "سلك وعزل", s: "سلك 0.75mm (4 ألوان) + جلبة حرارية", q: 1, p: 0, car: 1, on: 0 },
  { n: "علبة", s: "علبة بلاستيك صغيرة + سيليكون", q: 1, p: 0, car: 1, on: 0 }
]

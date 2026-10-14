import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'
const BOARDS = 'https://makerselectronics.com/product/pcb-prototype-board-vero-board-fr-2-dotted-line-center-splitted-breadboard/'

export const bom: BomRow[] = [
  { g: '📏 قبل أي حاجة' },
  { n: 'ملتيميتر', s: 'Digital Multimeter DT-830 · لقياس الفيشة والتجربة على المكتب', q: 1, p: 160, u: MK + 'avometer-dt-830/', on: 1 },
  { g: '💻 المرحلة 2: الكابل والبرنامج (مش من Makers · مش محسوب)' },
  { n: 'كابل KKL', s: 'USB KKL "VAG-COM 409.1" بشريحة FTDI (مش ELM327 ولا بلوتوث)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'أدابتر فيات', s: 'Fiat 3-pin → OBD-II أنثى، بسلك أحمر للبطارية · لازم تراجع توصيلته', q: 1, p: 0, car: 1, on: 0 },
  { n: 'حامل فيوز', s: 'حامل فيوز سلك + فيوز 1A · على السلك الأحمر', q: 1, p: 0, car: 1, on: 0 },
  { g: '🧠 الجهاز المحمول: المتحكم والشاشة' },
  { n: 'ESP32', s: 'ESP32 Development Board 30 رجل CP2102 Type-C (WROOM-32) · مش ESP32-S3 · فيه Wi-Fi وبلوتوث جوّاه، مفيش قطع زيادة للموبايل', q: 1, p: 280, u: MK + 'esp32-development-board-wifi-and-bluetooth-30-pin-with-cp2102-type-c-usb/', on: 1 },
  { n: 'هيدر أنثى', s: 'Female Header 1×40 (هتقص منه 2 × 15) · سوكيت للـ ESP32', q: 1, p: 10, est: 1, on: 1 },
  { n: 'شاشة', s: 'OLED 0.96 بوصة I2C 4 رجول (SSD1306)', q: 1, p: 140, u: MK + 'oled-display-i2c-4-pin-0-96%e2%80%b3-3/', on: 1 },
  { n: 'زرار', s: 'Mini Push Button 2 Pin 6×6 مم · صفحة / حساسات / أعطال', q: 3, p: 1, u: MK + 'mini-push-button-2-pin-6x6x15mm/', on: 1 },
  { g: '⚡ التغذية والحماية' },
  { n: 'موديول LM2596', s: 'LM2596S DC-DC Step Down 3A (U1) · اظبطه 5V', q: 1, p: 35, u: MK + 'lm2596s-dc-dc-converter-3a-step-down/', on: 1 },
  { n: 'دايود 3A', s: '1N5408 · D1 عكس القطبية', q: 1, p: 1.75, u: MK + '1n5408-diode-3a-1000v/', on: 1 },
  { n: 'دايود حماية TVS', s: 'P6KE18A · D2 (التغذية) و D3 (خط K)', q: 2, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 1 },
  { n: 'مكثف كيميائي', s: '100µF / 50V · C1', q: 1, p: 1.5, u: MK + 'capacitor-100uf-50v-6x12mm', on: 1 },
  { n: 'مكثف سيراميك', s: '100nF (104) · C2 C3 C4 C5', q: 4, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 1 },
  { g: '📡 دايرة خط K' },
  { n: 'كومباريتور', s: 'LM393 DIP-8 · U2 (بديل: LM2903)', q: 1, p: 5, est: 1, u: MK + 'lm393/', on: 1 },
  { n: 'ترانزستور', s: '2N2222A – TO-92 · Q1 (مش BC547)', q: 1, p: 1, est: 1, u: MK + '2n2222', on: 1 },
  { n: 'سوكيت', s: 'IC Socket DIP-8 · للـ LM393', q: 1, p: 1, est: 1, on: 1 },
  { n: 'مقاومة 1W', s: '470Ω 1W · R1 (Pull-up خط K)', q: 1, p: 2, est: 1, on: 1 },
  { n: 'مقاومة', s: '2.2kΩ ¼W · R2', q: 1, p: 0.15, est: 1, on: 1 },
  { n: 'مقاومة', s: '10kΩ ¼W · R3 R5 R7', q: 3, p: 0.15, u: MK + '2pcs-carbon-resistor-10k%cf%89-0-25w-thr/', on: 1 },
  { n: 'مقاومة', s: '47kΩ ¼W · R4', q: 1, p: 0.15, u: MK + 'carbon-resistor-47k%cf%89-0-25w/', on: 1 },
  { n: 'مقاومة', s: '100kΩ ¼W · R6 R10', q: 2, p: 0.15, u: MK + 'carbon-resistor-100k-0-25w/', on: 1 },
  { n: 'مقاومة', s: '470kΩ ¼W · R8 (Hysteresis)', q: 1, p: 0.15, est: 1, u: MK + 'resistor-470-kohm-0-25w', on: 1 },
  { n: 'مقاومة', s: '12kΩ ¼W · R11', q: 1, p: 0.15, est: 1, on: 1 },
  { g: '🧰 التجميع' },
  { n: 'بورد نقط', s: 'Vero Board FR-2 منقّط 7×9 سم (هتستخدم 34 × 26 خرم)', q: 1, p: 25, est: 1, u: BOARDS, on: 1 },
  { n: 'علبة', s: 'علبة بلاستيك حوالي 100×70×30 مم (البورد 7×9 + الشاشة) · مش معدن، المعدن بيقفل الـ Wi-Fi والبلوتوث', q: 1, p: 35, est: 1, on: 1 },
  { g: '🔌 التوصيل بالعربية (مش محسوب)' },
  { n: 'فيشة OBD', s: 'OBD-II ذكر بسلك (من كابل إطالة OBD مقصوص) · للجهاز', q: 1, p: 0, car: 1, on: 0 },
  { n: 'سلك', s: 'سلك 0.75 مم أحمر وأسود وأصفر (1.5 متر) + سلك معزول رفيع للـ JVK وJG', q: 1, p: 0, car: 1, on: 0 }
]

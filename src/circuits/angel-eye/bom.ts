import type { BomItem, BomRow } from '../../types/circuit'
import { bom as flickerBom } from '../parking-flicker/bom'

const MK = 'https://makerselectronics.com/product/'

const isItem = (r: BomRow): r is BomItem => 'n' in r
const DROPPED = ['22µF', '1MΩ', '390kΩ', '100kΩ']
const QUANTITY: Record<string, number> = { '1µF / 50V': 4, '47kΩ ¼W': 2, '10kΩ ¼W': 3 }
const RENAMED: Record<string, string> = {
  '1µF / 50V': '1µF / 50V · C4 C5 C6 + C8',
  '47kΩ ¼W': '47kΩ ¼W · R2 + R6',
  '10kΩ ¼W': '10kΩ ¼W · R3 + R4 + R7'
}

const flickerCore = flickerBom.slice(1, flickerBom.findIndex(r => !isItem(r) && r !== flickerBom[0])).filter(isItem)

const tvCircuit: BomItem[] = [
  ...flickerCore
    .filter(r => !DROPPED.some(d => r.s.startsWith(d)) && !r.s.startsWith('Vero'))
    .map(r => ({ ...r, q: QUANTITY[r.s] ?? r.q, s: RENAMED[r.s] ?? r.s })),
  { n: 'مقاومة', s: '220kΩ ¼W · R1', q: 1, p: 0.15, est: 1, on: 1 },
  { n: 'بورد نقط', s: 'بورد نقط 3×7 سم', q: 1, p: 15, est: 1, u: 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/', on: 1 }
]

export const bom: BomRow[] = [
  { g: '📺 دايرة الرعشة بقيم التلفزيون (الأصلي)' },
  ...tvCircuit,
  { g: '⭕ لو عايزها ثابتة (بدل الدايرة اللي فوق)' },
  { n: 'دايود', s: '1N4007 · D1', q: 1, p: 0.5, u: MK + '1n4007-diode-1a-1-1v1a-1kv-do-41/', on: 0 },
  { n: 'دايود حماية TVS', s: 'P6KE18A · D2', q: 1, p: 2, u: MK + 'esd-suppressors-tvs-diodes-600w-18v-uni-directional-p6ke18a-e3-73/', on: 0 },
  { n: 'مكثف سيراميك', s: '100nF (104) / 50V · C1', q: 1, p: 0.5, u: MK + 'ceramic-capacitor-100nf-50v/', on: 0 },
  { n: 'بورد مثقّب', s: 'حتة 10 × 5 خرم من بورد نقط 3×7 سم', q: 1, p: 10, est: 1, u: 'https://makerselectronics.com/product-category/breadboards-pcb-boards/page/2/', on: 0 },
  { g: 'الحلقة' },
  { n: 'شريط LED', s: 'شريط 12V أبيض · 5 لمبات في كل حتة (حوالي 5 سم) · حلقتين محتاجين 60 سم', q: 1, p: 35, est: 1, on: 1 },
  { g: '💡 لو الحلقة من LED 5mm (بدل الشريط)' },
  { n: 'LED', s: 'LED أبيض 5mm (Straw Hat أحسن) · 18 لكل حلقة', q: 36, p: 0.5, est: 1, on: 0 },
  { n: 'مقاومة', s: '220Ω ¼W (أحمر أحمر بني) · 6 لكل حلقة', q: 12, p: 0.15, est: 1, on: 0 },
  { g: 'من البيت (ببلاش)' },
  { n: 'سلك نحاس عريان', s: 'من كابل كهربا قديم (للخطين حوالين حلقة الـ LED 5mm)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'قاعدة الحلقة', s: 'غطا علبة بلاستيك أو غطا برطمان كبير أو CD قديمة', q: 2, p: 0, car: 1, on: 0 },
  { n: 'ناشر النور', s: 'جركن لبن أبيض أو علبة زبادي بيضا (بلاستيك نص شفاف)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'سلوك رفيعة', s: 'كابل نت (إنترنت) قديم: جواه 8 سلوك ملونة', q: 1, p: 0, car: 1, on: 0 },
  { n: 'سلك للعربية', s: 'سلك شاحن موبايل قديم أو سلك سماعة (للحلقة لحد الدايرة)', q: 2, p: 0, car: 1, on: 0 },
  { n: 'أدابتر تجربة', s: 'أدابتر راوتر أو ريسيفر مكتوب عليه 12V', q: 1, p: 0, car: 1, on: 0 },
  { n: 'لزق وعزل', s: 'شمع (Hot glue) للتجربة · سيليكون شفاف للتركيب · شريط عازل', q: 1, p: 0, car: 1, on: 0 },
  { n: 'عاكس', s: 'ورق ألومنيوم من المطبخ (ورا الحلقة)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'برجل الدايرة', s: 'كوباية أو غطا قطره 9–10 سم ترسم بيه الدايرة', q: 1, p: 0, car: 1, on: 0 },
  { g: 'من محل قطع غيار العربيات (مش محسوب)' },
  { n: 'مشتت حراري', s: 'مشتت صغير TO-220 + جلبة/مايكا عازلة للـ TIP122 (للرعشة)', q: 1, p: 0, car: 1, on: 0 },
  { n: 'حامل فيوز', s: 'حامل فيوز خارجي + فيوز 1A', q: 1, p: 0, car: 1, on: 0 },
  { n: 'وصلة تفريع', s: 'Tap connector (وصلة سلك على سلك) أو جلبة حرارية', q: 2, p: 0, car: 1, on: 0 },
  { n: 'علبة', s: 'علبة بلاستيك صغيرة للدايرة + أفيز (رباط بلاستيك)', q: 1, p: 0, car: 1, on: 0 }
]

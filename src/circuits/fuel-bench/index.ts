import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { fuelSim, type FuelParams, type FuelState } from './simulate'
import { steps } from './steps'
import { trouble, wiring } from './wiring'

export const fuelBench: Circuit<FuelParams, FuelState> = {
  id: 'fuel-bench',
  title: 'متحكم أمان لطرمبة البنزين (نموذج مكتب)',
  card: {
    icon: '⛽',
    summary: 'Arduino Nano بيراقب حساس ضغط ويتحكم في "طرمبة" (لمبة 5W) بمقبض، وأي عطل يقفل الخرج لحد Reset مقصود. تدريب على المكتب بس، من غير بنزين.',
    level: 'متقدم · Arduino + كود',
    categories: ['code', 'desk']
  },
  hero,
  overview,
  sim: fuelSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'الحماية والموسفت نفس قطع الكيتات التانية. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'المحاكي، وبعدين الكود، وبعدين البورد واللوحة، وبعدين اختبارات القبول. <b>آخر خطوة: وقف، ومتوصّلش بأي حاجة حقيقية.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات',
    sub: 'استخدمها وانت بتلحم. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  assembly,
  livePreview,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك.', items: trouble },
  footer
}

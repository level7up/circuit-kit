import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { tempraSim, type TempraParams, type TempraState } from './simulate'
import { steps } from './steps'
import { trouble, wiring } from './wiring'

export const tempraDiag: Circuit<TempraParams, TempraState> = {
  id: 'tempra-diag',
  title: 'جهاز تشخيص فيات تمبرا + برنامج مجاني',
  card: {
    icon: '🩺',
    summary: 'اقرا كمبيوتر المحرك Bosch MA1.7 في التمبرا 1.6 من خط K: برنامج مجاني على المتصفح مع كابل KKL، وجهاز ESP32 محمول بشاشة. قراية بس، مفيش مسح ولا تشغيل.',
    level: 'متقدم · ESP32 + برنامج ويب',
    categories: ['car', 'code']
  },
  hero,
  overview,
  sim: tempraSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'اشتري الملتيميتر الأول، وبعده الكابل والأدابتر. الجهاز المحمول آخر حاجة. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع. الكابل والأدابتر والفيشة مش محسوبين: سعرهم مش متأكد منه.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'القياس الأول، وبعدين البرنامج مع الكابل، وبعدين الجهاز. <b>متوصّلش أي حاجة بالعربية قبل ما الخطوة 1 تخلص.</b>',
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

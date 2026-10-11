import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { patternSim, type PatternParams, type PatternState } from './simulate'
import { steps } from './steps'
import { trouble, wiring } from './wiring'

export const headlightPatterns: Circuit<PatternParams, PatternState> = {
  id: 'headlight-patterns',
  title: 'كشافات LED بأربع أشكال',
  card: {
    icon: '🎛️',
    summary: 'كشافين LED منفصلين بيعملوا 4 أشكال بسويتش دوّار: تبادل، ومع بعض، ودبل فلاش، وشمال ← يمين. ساعة + عدّاد + 16 دايود + موسفتين. للعرض والعربية راكنة.',
    level: 'متقدم · شريحتين و16 دايود'
  },
  hero,
  overview,
  sim: patternSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'الساعة والحماية نفس قطع الكيتات التانية. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'المحاكي، وبعدين البورد، وبعدين لمبات بيان، وبعدين الكشافات على المكتب. <b>العربية آخر حاجة، وللعرض بس.</b>',
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

import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { footer, hero, overview, pinouts, stripPreview } from './content'
import { chaseSim, type ChaseParams, type ChaseState } from './simulate'
import { steps } from './steps'
import { speedStyles } from './styles'
import { trouble, wiring } from './wiring'

export const theaterChase: Circuit<ChaseParams, ChaseState> = {
  id: 'theater-chase',
  title: 'شريط LED بيجري (Theater Chase)',
  card: {
    icon: '🎭',
    summary: 'شريط LED عادي 20 سم بيتقطّع 4 حتت، والنور بيجري عليهم زي لمبات المسرح. ساعة + عدّاد + 3 ترانزستورات، من غير برمجة.',
    level: 'متوسط · شريحتين'
  },
  hero,
  overview,
  sim: chaseSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'كتير منهم موجود في كيت الرعشة. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'الشريط الأول، وبعدين البورد، وبعدين التجربة. <b>جرّب كل خطوة قبل اللي بعدها.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات',
    sub: 'استخدمها وانت بتلحم. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  assembly,
  presets: speedStyles,
  stripPreview,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك.', items: trouble },
  footer
}

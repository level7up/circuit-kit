import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { car, carFace, footer, hero, overview, pinouts } from './content'
import { angelSim, type AngelParams, type AngelState } from './simulate'
import { steps } from './steps'
import { fadeStyles } from './styles'
import { trouble, wiring } from './wiring'

export const angelEye: Circuit<AngelParams, AngelState> = {
  id: 'angel-eye',
  title: 'Angel Eye من حاجات البيت',
  card: {
    icon: '⭕',
    summary: 'حلقة نور حوالين الفانوس من شريط LED وغطا علبة بلاستيك، بتولّع بالراحة (فيد) بقطع من بواقي كيت الرعشة.',
    level: 'مبتدئ · أول لحام'
  },
  hero,
  overview,
  sim: angelSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'الإلكترونيات نفس قطع كيت الرعشة. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير. حاجات البيت ببلاش.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع. حاجات البيت والعربية مش محسوبة.'
  },
  steps: {
    title: 'خطوات التنفيذ: من الشريط للفانوس',
    sub: 'الحلقة الأول، وبعدين الدايرة، وبعدين العربية. <b>جرّب على الأدابتر بعد كل خطوة.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات',
    sub: 'استخدمها وانت بتلحم. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  assembly,
  presets: fadeStyles,
  carFace,
  car,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك.', items: trouble },
  footer
}

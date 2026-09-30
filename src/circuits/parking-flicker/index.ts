import type { Circuit } from '../../types/circuit'
import { board } from './board'
import { bom } from './bom'
import { car, footer, hero, overview, pinouts } from './content'
import { schematic } from './schematic'
import { flickerSim, type FlickerParams, type FlickerState } from './simulate'
import { steps } from './steps'
import { trouble } from './trouble'
import { wiring } from './wiring'

export const parkingFlicker: Circuit<FlickerParams, FlickerState> = {
  id: 'parking-flicker',
  title: 'دايرة رعشة لمبة الركن',
  card: {
    icon: '🕯️',
    summary: 'لمبة الركن في العربية بترعش زي لهب الشمعة، من غير أي برمجة: 3 مذبذبات بتتخلط مع بعض.',
    level: 'مبتدئ · مناسب كأول مشروع'
  },
  hero,
  overview,
  schematic,
  board,
  sim: flickerSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'علّم على اللي هتشتريه والإجمالي هيتحسب لوحده. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير، والشحن مش محسوب.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع. حاجات العربية من محل قطع الغيار ومش محسوبة.'
  },
  steps: {
    title: 'خطوات التنفيذ: من التجربة للتركيب',
    sub: 'امشي خطوة خطوة، وعلّم على كل بند وانت بتخلصه. <b>متعدّيش مرحلة قبل ما القياس بتاعها يطلع صح.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات (نقطة بنقطة)',
    sub: 'استخدمها وانت بتركّب على البريد بورد، ومرة تانية وانت بتلحم. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  car,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك.', items: trouble },
  footer
}

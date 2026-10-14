import type { Circuit } from '../../types/circuit'
import { assembly } from './assembly'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { chargerSim, type ChargerParams, type ChargerState } from './simulate'
import { stepVariants, steps } from './steps'
import { trouble, wiring } from './wiring'

export const usbCharger: Circuit<ChargerParams, ChargerState> = {
  id: 'usb-charger',
  title: 'شاحن USB للعربية بفولتميتر',
  card: {
    icon: '🔌',
    summary: 'مخرجين USB لحد 3A وشاشة بتقرا جهد البطارية، بيشتغلوا مع الكونتاكت بس. موديول جاهز + بورد حماية 3 قطع.',
    level: 'مبتدئ · موديولات جاهزة',
    categories: ['car', 'power', 'beginner', 'no-code']
  },
  hero,
  overview,
  sim: chargerSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'الحماية نفس قطع الكيتات التانية ما عدا الدايود. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير، والموديول كان خلصان وقتها.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'اختار الشاحن: <b>موديول USB جاهز</b> (الأسهل) أو <b>LM2596 + مخرج USB</b> لو الموديول مش موجود. <b>جرّب على الأدابتر قبل العربية.</b>',
    items: steps,
    variants: stepVariants
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

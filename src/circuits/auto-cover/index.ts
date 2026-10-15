import type { Circuit } from '../../types/circuit'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { coverSim, type CoverParams, type CoverState } from './simulate'
import { steps } from './steps'
import { trouble, wiring } from './wiring'

export const autoCover: Circuit<CoverParams, CoverState> = {
  id: 'auto-cover',
  title: 'غطا عربية أوتوماتيك بريموت',
  card: {
    icon: '🚘',
    summary: 'أسطوانة على السقف بتفرد الغطا على العربية وتلفّه بدوسة ريموت. Arduino بيعد اللفات ويوقّف الموتور لو اتزنق، والكهربا من بطارية العربية.',
    level: 'متقدم · ميكانيكا + Arduino',
    categories: ['car', 'code']
  },
  hero,
  overview,
  sim: coverSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'نسخة البيت من <a href="https://apexevlabs.com/products/apex-autocover-automatic-solar-car-cover" target="_blank" rel="noopener">Apex AutoCover</a> (299$) من غير الطاقة الشمسية والإنذار. أغلب الأسعار تقديرية من السوق وممكن تتغير.',
    rows: bom,
    footnote: 'حاجات <span class="est">تقديري</span> سعرها مش ظاهر على الموقع. المغناطيس والموتور أغلى حاجتين.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'الإلكترونيات على المكتب الأول، وبعدين الأسطوانة والغطا، وبعدين العربية. <b>العربية راكنة بس، ولف وشيل قبل ما تتحرك.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات',
    sub: 'استخدمها وانت بتلحم. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  livePreview,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك، وبص على الـ Serial Monitor.', items: trouble },
  footer
}

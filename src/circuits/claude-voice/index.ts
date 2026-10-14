import type { Circuit } from '../../types/circuit'
import { bom } from './bom'
import { footer, hero, livePreview, overview, pinouts } from './content'
import { voiceSim, type VoiceParams, type VoiceState } from './simulate'
import { steps } from './steps'
import { trouble, wiring } from './wiring'

export const claudeVoice: Circuit<VoiceParams, VoiceState> = {
  id: 'claude-voice',
  title: 'زرار تكلّم بيه Claude Code',
  card: {
    icon: '🎙️',
    summary: 'ESP32-S3 عليه زرار: امسكه واتكلم، والماك يحوّل كلامك لنص ويبعته لـ Claude Code ويقرالك الرد. الجهاز بيبعت ضغطات بس، ومفيهوش أي مفتاح.',
    level: 'متوسط · ESP32 + Python',
    categories: ['code', 'desk', 'ai']
  },
  hero,
  overview,
  sim: voiceSim,
  pinouts,
  bom: {
    title: 'المكونات والتكلفة',
    sub: 'اشتري أول مجموعة بس، وكمّل بعد ما البرنامج يشتغل. الأسعار من <a href="https://makerselectronics.com/" target="_blank" rel="noopener">Makers Electronics</a> وقت البحث وممكن تتغير.',
    rows: bom,
    footnote: 'اتأكد إن البورد <b>ESP32-S3</b> مش ESP32 عادي، وإن الكابل بينقل بيانات مش شحن بس.'
  },
  steps: {
    title: 'خطوات التنفيذ',
    sub: 'الماك الأول من غير هاردوير، وبعدين الزرار، وبعدين الـ LED والعلبة. <b>متشتريش حاجة قبل ما الخطوة 1 تنجح.</b>',
    items: steps
  },
  wiring: {
    title: 'قائمة التوصيلات',
    sub: 'كلها على الهيدر J1. علّم على كل وصلة بعد ما تتأكد منها.',
    groups: wiring
  },
  livePreview,
  trouble: { title: 'الأعطال وحلولها', sub: 'افتح العَرَض اللي عندك.', items: trouble },
  footer
}

import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import { CRANKING, ENGINE_RUN, KEY_ACC, KEY_OFF, type ChargerParams, type ChargerState } from './simulate'

export const hero: HeroMeta = {
  tag: 'مشروع DIY · عربية 12V · من غير برمجة',
  titleHtml: 'شاحن <span class="grad">USB</span> للعربية<br>بمخرجين وفولتميتر',
  lead: 'مخرجين USB على الطبلون بيشحنوا موبايلين مع بعض لحد 3A، وشاشة صغيرة بتوريك جهد البطارية على طول. بيشتغل مع الكونتاكت بس، فمش هيفضّي البطارية والعربية راكنة. موديول جاهز + بورد حماية صغير.',
  stats: [
    { value: '2 × USB', label: 'لحد 3A مع بعض' },
    { value: '≈ 90%', label: 'كفاءة الموديول' },
    { value: '3 قطع', label: 'حماية على بورد صغير' },
    { value: '0 برمجة', label: 'موديولات جاهزة' }
  ],
  bulbCaption: 'المحاكي شغال لايف ↓'
}

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'تلات مراحل: كهربا مع الكونتاكت، وحماية، وتحويل لـ 5V.',
  stages: [
    { icon: '🔑', stage: 'المرحلة 1', title: 'سلك الكونتاكت', body: 'بناخد الكهربا من سلك <b>ACC</b>: عليه 12V بس والمفتاح مفتوح. عليه <b>فيوز 3A</b> في أوله.' },
    { icon: '🛡️', stage: 'المرحلة 2', title: 'الحماية', body: '<b>1N5408</b> ضد عكس السلوك (3A، مش 1N4007)، و<b>P6KE18A</b> ضد نبضات الدينامو، و<b>100µF + 100nF</b> لتثبيت الجهد.' },
    { icon: '🔌', stage: 'المرحلة 3', title: 'الموديول', body: 'موديول <b>Step-down</b> بيحوّل 12–14V لـ <b>5.1V</b> بكفاءة حوالي 90%، وطالع منه مخرجين USB.' },
    { icon: '📟', stage: 'إضافة', title: 'الفولتميتر', body: 'شاشة صغيرة بسلكين قبل الدايود: بتقرا جهد البطارية. <b>12.4–12.7V</b> والموتور واقف = بطارية سليمة، و<b>13.8–14.4V</b> والموتور دوّار = الدينامو شغال.' }
  ],
  cards: [
    { kind: 'warn', title: '🔥 ليه مش 7805؟', body: 'الـ 7805 بيحوّل الفرق كله لحرارة: من 14V لـ 5V على 2A = <b>18 وات</b> حرارة. الموديول بيسخن <b>1–2 وات</b> بس. جرّب الاتنين في المحاكي.' },
    { kind: 'ok', title: '♻️ من بواقي الكيتات', body: 'الـ P6KE18A والمكثفات نفس اللي في كيت الرعشة، والسويتش KCD4 نفس سويتش الـ Angel eye.' }
  ]
}

export const pinouts: PinoutDef = {
  title: 'الأطراف والقطبية',
  sub: 'مفيش شرايح، بس كل حاجة ليها + و−.',
  chips: [],
  polarity: [
    { title: '▶| الدايودات', body: 'الشريطة = <b>الكاثود</b>.<br>1N5408: الشريطة ناحية الموديول.<br>P6KE18A: الشريطة على +12V والتاني على الأرضي.' },
    { title: '🔋 المكثف 100µF', body: 'الرجل <b>الطويلة = +</b>، والجنب اللي عليه شريطة = −.' },
    { title: '🔌 الموديول', body: 'مكتوب عليه <b>IN+</b> و<b>IN−</b> (أو VIN وGND). عكسهم ممكن يحرقه، والـ D1 بيحميه من ده.' },
    { title: '📟 الفولتميتر', body: '<b>الأحمر</b> على + و<b>الأسود</b> على −. لو فيه سلك تالت (أصفر)، وصّله مع الأحمر.' },
    { title: '🔧 LM2596 (البديل)', body: 'IN+ وIN− للدخل، وOUT+ وOUT− للخرج. <b>اظبط التريمر على 5.1V قبل ما توصّل أي موبايل.</b> في مخرج الـ USB: رجل 1 = 5V، ورجل 4 = GND، ورجل 2 و3 (D− وD+) وصّلهم ببعض عشان الموبايل يشحن أسرع.' }
  ]
}

const fmt = (v: number, digits = 1) => v.toFixed(digits)

function phone(x: number, charging: boolean, present: boolean): string {
  if (!present) return `<rect x="${x}" y="150" width="70" height="120" rx="12" fill="none" stroke="#2a3242" stroke-dasharray="6 5"/>`
  const bolt = charging ? `<path d="M${x + 38} 190 l-12 22 h10 l-6 20 l18 -26 h-10 l6 -16 z" fill="#3ddc84"/>` : `<text x="${x + 35}" y="215" text-anchor="middle" fill="#ff5d5d" font-size="20" font-weight="800">✕</text>`
  return `<rect x="${x}" y="150" width="70" height="120" rx="12" fill="#11151f" stroke="#566179" stroke-width="2"/>` +
    `<rect x="${x + 6}" y="162" width="58" height="92" rx="4" fill="${charging ? '#0f2a1d' : '#1d1d1d'}"/>` + bolt
}

function dashboard(s: ChargerState, p: ChargerParams): string {
  const charging = s.vout >= 4.75 && s.iout > 0
  const reading = s.vbat > 2.5 ? fmt(s.vbat) : ''
  const ledOn = s.vout >= 4.75
  const heatColor = s.heat > 6 ? '#ff5d5d' : s.heat > 2.5 ? '#ffb547' : '#3ddc84'
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/><rect x="20" y="20" width="560" height="110" rx="16" fill="#1d2230" stroke="#2a3242" stroke-width="2"/>` +
    `<rect x="50" y="45" width="130" height="60" rx="6" fill="#050608" stroke="#4a5263"/>` +
    `<text x="115" y="88" text-anchor="middle" fill="#ff4d4d" font-size="34" font-family="monospace" font-weight="700">${reading}</text>` +
    `<text x="115" y="122" text-anchor="middle" fill="#9aa6bd" font-size="12">الفولتميتر</text>` +
    `<rect x="240" y="50" width="70" height="26" rx="3" fill="#050608" stroke="#9aa6bd"/><rect x="250" y="58" width="50" height="10" fill="#3b82f6"/>` +
    `<rect x="330" y="50" width="70" height="26" rx="3" fill="#050608" stroke="#9aa6bd"/><rect x="340" y="58" width="50" height="10" fill="#3b82f6"/>` +
    `<circle cx="430" cy="63" r="7" fill="${ledOn ? '#5aa9ff' : '#2a3242'}"/>` +
    `<text x="320" y="104" text-anchor="middle" fill="#9aa6bd" font-size="12">USB 1 · USB 2 · ${fmt(s.vout, 2)}V</text>` +
    `<text x="510" y="72" text-anchor="middle" fill="${heatColor}" font-size="14" font-weight="700">${fmt(s.heat)} وات</text>` +
    `<text x="510" y="94" text-anchor="middle" fill="#9aa6bd" font-size="12">حرارة المحوّل</text>` +
    `<line x1="275" y1="76" x2="275" y2="150" stroke="#9aa6bd" stroke-width="${p.phones >= 1 ? 3 : 0}"/>` +
    `<line x1="365" y1="76" x2="365" y2="150" stroke="#9aa6bd" stroke-width="${p.phones >= 2 ? 3 : 0}"/>` +
    phone(240, charging, p.phones >= 1) + phone(330, charging, p.phones >= 2) +
    (s.limited ? `<text x="300" y="292" text-anchor="middle" fill="#ffb547" font-size="13">⚠ الموبايلات طالبة أكتر من اللي المحوّل يقدر عليه</text>` : '') +
    `</svg>`
}

export const livePreview: LivePreviewDef<ChargerParams, ChargerState> = {
  render: dashboard,
  note: 'ده الطبلون بالشاحن: الفولتميتر بيقرا جهد البطارية، والـ USB بيطلّع 5.1V. غيّر حالة العربية أو عدد الموبايلات، أو جرّب الـ 7805 من تبويب <b>المحاكي</b> وشوف الحرارة.',
  toggles: [{
    label: 'العربية',
    options: [{ v: ENGINE_RUN, text: '🚗 دوّار' }, { v: KEY_ACC, text: '🔑 كونتاكت' }, { v: CRANKING, text: '⚡ بتدوّر' }, { v: KEY_OFF, text: '⛔ مقفولة' }],
    get: p => p.car,
    set: (p, v) => ({ ...p, car: [ENGINE_RUN, KEY_ACC, CRANKING, KEY_OFF].includes(v) ? v : ENGINE_RUN })
  }, {
    label: 'الموبايلات',
    options: [{ v: 0, text: '0 📱' }, { v: 1, text: '1 📱' }, { v: 2, text: '2 📱' }],
    get: p => p.phones,
    set: (p, v) => ({ ...p, phones: Math.max(0, Math.min(2, v)) })
  }]
}

export const footer = 'صُمم كدليل تعليمي. فيوز 3A على سلك الكونتاكت، واشتغل والقطب السالب للبطارية مفصول. · 1N5408 · P6KE18A · Step-down 5V 3A'

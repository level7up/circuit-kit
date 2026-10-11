import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import { dipTopViewSvg, to220Svg, type PinRole } from '../../lib/pinouts'
import { STEPS, outputs } from './patterns'
import { OFF, ON, type FlashParams, type FlashState } from './simulate'

export const hero: HeroMeta = {
  tag: 'مشروع DIY · 12V · من غير برمجة · للعرض والعربية راكنة',
  titleHtml: 'كشافات LED<br><span class="grad">دبل فلاش</span>',
  lead: 'كشافين LED منفصلين بيعملوا دبل فلاش: ومضتين شمال، وبعدين ومضتين يمين، ويكرر. ساعة (CD40106) وعدّاد (CD4017) و4 دايودات بيرسموا الشكل، وموسفتين بيشغّلوا الكشافات. للعرض والعربية راكنة بس، ومش متوصّل بفوانيس العربية الأصلية خالص.',
  stats: [
    { value: '2 + 2', label: 'ومضتين لكل جنب' },
    { value: '≈ 80 ms', label: 'كل ومضة' },
    { value: '2 × 1.5A', label: 'كشاف LED لكل جنب' },
    { value: '0 ريلاي', label: 'موسفت IRLZ44N' }
  ],
  bulbCaption: 'المحاكي شغال لايف ↓'
}

const STEP_HEAD = Array.from({ length: STEPS }, (_, n) => `<th>${n}</th>`).join('')

const sideRow = (name: string, isLeft: boolean) => `<tr><td>${name}</td>` +
  Array.from({ length: STEPS }, (_, n) => {
    const o = outputs(n)
    const lit = isLeft ? o.left : o.right
    return `<td style="text-align:center">${lit ? (isLeft ? '🟦' : '🟥') : '·'}</td>`
  }).join('') + '</tr>'

const STATE_TABLE = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th>الخطوة</th>' + STEP_HEAD + '</tr>' +
  sideRow('الشمال (Q0 وQ2)', true) + sideRow('اليمين (Q5 وQ7)', false) +
  '</table></div><p>كل خانة خطوة ≈ 80 ms، واللفة كلها ≈ 0.8 ثانية. مفيش خطوة الجنبين فيها منوّرين مع بعض.</p>'

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'خمس مراحل ورا بعض. مفيش ريلاي ولا برمجة: الشكل مرسوم بـ 4 دايودات.',
  stages: [
    { icon: '🛡️', stage: 'المرحلة 1', title: 'الحماية والـ 9V', body: 'سويتش وفيوز <b>1A</b>، وبعدين <b>1N4007</b> ضد عكس السلوك، و<b>P6KE18A</b> ضد النبضات، و<b>7809</b> بيطلّع 9V ثابتة للشرايح.' },
    { icon: '⏱️', stage: 'المرحلة 2', title: 'الساعة', body: 'بوابة من <b>CD40106</b> مع <b>R1 100k</b> و<b>C4 1µF</b>: نبضة كل حوالي <b>80 ms</b>. نفس ساعة كيت الشريط اللي بيجري.' },
    { icon: '🔢', stage: 'المرحلة 3', title: 'العدّاد', body: '<b>CD4017</b> بيعدّ من Q0 لـ Q9 ويرجع، وفي كل لحظة خرج واحد بس شغال. <b>C5 وR3</b> بيرجّعوه لـ Q0 أول ما الكهربا تيجي.' },
    { icon: '🧩', stage: 'المرحلة 4', title: 'الدايودات (4)', body: '<b>D3 وD4</b> بيجمّعوا الخطوة 0 و2 على خط الشمال، و<b>D5 وD6</b> الخطوة 5 و7 على خط اليمين. الدايود بيمنع الخروج تأثّر على بعض.' },
    { icon: '💡', stage: 'المرحلة 5', title: 'الموسفتات', body: 'كل خط بيفتح <b>IRLZ44N</b> عن طريق 1k، و<b>100k</b> بيقفله لو مفيش إشارة. الموسفت بيوصّل − الكشاف للأرضي.' }
  ],
  cards: [
    { kind: 'ok', title: '📋 الشكل خطوة خطوة', body: STATE_TABLE },
    { kind: 'warn', title: '🚫 مش للطريق', body: 'نور بيرمش قدام العربية وهي ماشية <b>ممنوع</b> ويلخبط اللي قدامك. ده للعرض والعربية <b>راكنة في مكان خاص</b>. الكشافين LED <b>منفصلين</b>: متوصّلش الدايرة بالفوانيس الأصلية ولا الإشارات ولا الفلاشر أبداً.' },
    { kind: 'warn', title: '💡 ليه مش فوانيس الهالوجين 55 وات؟', body: 'اللمبة 55W بتسحب <b>4.6A</b> وهي سخنة، وأضعاف كده وهي باردة أول ما تولّع، والتقطيع السريع بيموّت الفتلة. عشان كده الكيت لكشافات LED لحد <b>1.5A</b> لكل جنب.' },
    { kind: 'ok', title: '⚙️ ليه مفيش ريلاي؟', body: 'الريلاي بياخد 5–10 ms عشان يقفل، ونقطه بتنط، وعمره كام مليون مرة بس: بـ 12 نقلة في الثانية هيخلص في أسابيع. الموسفت مفيهوش حاجة بتتحرك.' },
    { kind: 'ok', title: '🧯 لو حاجة باظت', body: 'الكهربا فصلت أو السويتش اتقفل: <b>R6 وR7 بيطفّوا الاتنين</b>. لو الساعة وقفت، العدّاد بيقف على خطوة وممكن جنب يفضل منوّر: اقفل السويتش. جرّب ده في المحاكي.' }
  ]
}

const DIP_40106: Record<number, PinRole> = {
  1: ['دخل الساعة · R1 · C4', '#7dd3fc'], 2: ['خرج الساعة ← CD4017', '#5aa9ff'], 3: ['← GND', '#9aa6bd'], 4: ['فاضي', '#4a5470'], 5: ['← GND', '#9aa6bd'], 6: ['فاضي', '#4a5470'], 7: ['GND', '#9aa6bd'],
  8: ['فاضي', '#4a5470'], 9: ['← +9V', '#ff9f43'], 10: ['فاضي', '#4a5470'], 11: ['← +9V', '#ff9f43'], 12: ['فاضي', '#4a5470'], 13: ['← +9V', '#ff9f43'], 14: ['+9V', '#ff9f43']
}

const DIP_4017: Record<number, PinRole> = {
  1: ['Q5 ← D5 ← اليمين', '#fb923c'], 2: ['فاضي (Q1)', '#4a5470'], 3: ['Q0 ← D3 ← الشمال', '#a78bfa'], 4: ['Q2 ← D4 ← الشمال', '#fbbf24'], 5: ['فاضي (Q6)', '#4a5470'], 6: ['Q7 ← D6 ← اليمين', '#e879f9'], 7: ['فاضي (Q3)', '#4a5470'], 8: ['GND', '#9aa6bd'],
  9: ['فاضي (Q8)', '#4a5470'], 10: ['فاضي (Q4)', '#4a5470'], 11: ['فاضي (Q9)', '#4a5470'], 12: ['فاضي (CO)', '#4a5470'], 13: ['INH ← GND', '#9aa6bd'], 14: ['CLK ← الساعة', '#5aa9ff'], 15: ['RESET ← C5 · R3', '#f9a8d4'], 16: ['+9V', '#ff9f43']
}

export const pinouts: PinoutDef = {
  title: 'الرجول والقطبية',
  sub: 'شريحتين وموسفتين ومنظّم. أغلب الأعطال من شريحة أو دايود مقلوب.',
  chips: [
    dipTopViewSvg('CD40106 – الساعة', 'CD40106BE', DIP_40106, 'الحز فوق · بنستخدم بوابة 1→2 بس'),
    dipTopViewSvg('CD4017 – العدّاد', 'CD4017BE', DIP_4017, 'الحز فوق · 4 خروج بس متوصّلة'),
    to220Svg('IRLZ44N', ['G', 'D', 'S'], ['من R4 / R5', '− الكشاف', 'أرضي'], 'الطبق = D', '#2563eb'),
    to220Svg('LM7809', ['IN', 'GND', 'OUT'], ['+12V', 'أرضي', '+9V'], 'الطبق = GND', '#9aa6bd')
  ],
  polarity: [
    { title: '▶| الدايودات', body: 'الشريطة = <b>الكاثود</b>.<br>الـ 4 دايود 1N4148: <b>الشريطة تحت</b> ناحية خط الشمال واليمين.<br>1N4007: الشريطة ناحية +12V.<br>P6KE18A: الشريطة على +12V.' },
    { title: '🔋 المكثفات الكيميائي', body: 'C1 وC3 100µF وC4 1µF: الرجل <b>الطويلة = +</b>.' },
    { title: '⚡ IRLZ44N', body: 'Logic-level: بيفتح كامل بـ 5V على البوابة، فالـ 8V اللي جاية من الدايودات كفاية وزيادة. <b>IRFZ44N</b> (من غير L) بيشتغل بس أسخن شوية.' },
  ]
}

const POD_GLOW = '#eef5ff'

function pod(cx: number, lit: boolean, name: string): string {
  const glow = lit ? `<circle cx="${cx}" cy="215" r="58" fill="${POD_GLOW}" opacity=".18"/><circle cx="${cx}" cy="215" r="38" fill="${POD_GLOW}" opacity=".35"/>` : ''
  return glow + `<circle cx="${cx}" cy="215" r="24" fill="#1b2333" stroke="#566179" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="215" r="17" fill="${lit ? POD_GLOW : '#2a3242'}"/>` +
    `<text x="${cx}" y="268" text-anchor="middle" fill="#9aa6bd" font-size="12">${name}</text>`
}

function carFront(s: FlashState, p: FlashParams): string {
  const caption = p.enable === OFF ? 'السويتش مقفول' : '⚡ دبل فلاش · الخطوة ' + (s.powered ? s.step : '—')
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/>` +
    `<path d="M120 70 L480 70 L540 130 L540 240 L60 240 L60 130 Z" fill="#c9ccd3" stroke="#7a808c" stroke-width="2"/>` +
    `<rect x="70" y="135" width="120" height="40" rx="4" fill="#dfe6ef" stroke="#7a808c"/><rect x="410" y="135" width="120" height="40" rx="4" fill="#dfe6ef" stroke="#7a808c"/>` +
    `<rect x="205" y="140" width="190" height="30" rx="3" fill="#2a2f3a"/>` +
    `<text x="300" y="160" text-anchor="middle" fill="#9aa6bd" font-size="11">الفوانيس الأصلية: مش متوصّلة</text>` +
    `<rect x="55" y="190" width="490" height="50" rx="8" fill="#3a3f4b"/>` +
    pod(150, s.right, 'يمين العربية') + pod(450, s.left, 'شمال العربية') +
    `<text x="300" y="292" text-anchor="middle" fill="#ffb547" font-size="13">${caption}</text>` +
    `</svg>`
}

export const livePreview: LivePreviewDef<FlashParams, FlashState> = {
  render: carFront,
  note: 'إنت واقف قدام العربية، فشمالها على يمينك. الكشافين LED متركّبين لوحدهم على الإكصدام، والفوانيس الأصلية زي ما هي. جرّب السرعة والأعطال من تبويب <b>المحاكي</b>.',
  toggles: [{
    label: 'السويتش',
    options: [{ v: ON, text: '✅ شغّال' }, { v: OFF, text: '⛔ مقفول' }],
    get: p => p.enable,
    set: (p, v) => ({ ...p, enable: v === OFF ? OFF : ON })
  }]
}

export const footer = 'صُمم كدليل تعليمي للعرض والعربية راكنة في مكان خاص، مش للاستخدام على الطريق ومش مختبر كمنتج للعربيات. فيوز 1A للدايرة و2A لكل كشاف. · CD40106 · CD4017 · 1N4148 × 4 · IRLZ44N · LM7809'

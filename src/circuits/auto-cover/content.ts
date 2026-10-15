import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import type { Pt } from '../../lib/scene/draw'
import { CMD_CLOSE, CMD_OPEN, CMD_STOP, FAULTS, FULL_TURNS, driveOf } from './controller'
import { FAULT_HALL_DEAD, FAULT_HOME_DEAD, FAULT_JAM, FAULT_NONE, openPct, stateText, type CoverParams, type CoverState } from './simulate'

export const hero: HeroMeta = {
  tag: 'مشروع DIY · عربية 12V · Arduino',
  titleHtml: 'غطا عربية <span class="grad">أوتوماتيك</span><br>بريموت',
  lead: 'أسطوانة على سقف العربية بتفرد الغطا على الكبوت والشنطة في حوالي 12 ثانية بدوسة ريموت، وبتلفّه تاني. بيشتغل من بطارية العربية بدل الطاقة الشمسية، ومن غير الإنذار. فكرة Apex AutoCover بأقل من نص التمن.',
  stats: [
    { value: '≈ 12 ث', label: 'يفرد أو يلف' },
    { value: '8 لفات', label: 'بيعدّها حساس Hall' },
    { value: '≈ 28mA', label: 'سحب وهي راكنة' },
    { value: '≈ 6,500 ج', label: 'بدل 299$' }
  ],
  bulbCaption: 'المحاكي شغال لايف ↓'
}

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'أسطوانة واحدة بعرض العربية، وموتور واحد، والغطا نصين ملفوفين عليها في نفس الاتجاه.',
  stages: [
    { icon: '🧻', stage: 'الميكانيكا', title: 'أسطوانة زي الستارة الرول', body: 'ماسورة ألومنيوم 50 مم على رولمان بلي جوه ماسورة PVC على السقف. <b>النص القدّامي</b> طالع من فوق الأسطوانة على الإزاز والكبوت، و<b>النص الورّاني</b> طالع من تحتها على الشنطة. لفّة واحدة بتفرد الاتنين مع بعض.' },
    { icon: '⚙️', stage: 'الحركة', title: 'موتور Worm Gear', body: 'موتور 12V بجير حلزوني <b>40 لفة/دقيقة</b>. الجير الحلزوني بيقفل نفسه: لما الكهربا تقطع الهوا مش بيقدر يلف الغطا. وأستك بخطاف في كل طرف بيشد الغطا لتحت.' },
    { icon: '🧠', stage: 'التحكم', title: 'Arduino + BTS7960', body: 'الأردوينو بيقرا الريموت (YK04)، ويشغّل الموتور قدّام أو ورا عن طريق <b>BTS7960</b>، ويعد اللفات بـ <b>حساس Hall</b>، ويقف على <b>سويتش القفل</b>، ويقرا تيار الموتور عشان يوقّف لو اتزنق.' },
    { icon: '🔋', stage: 'الكهربا', title: 'من بطارية العربية', body: 'سلك مباشر من البطارية عليه <b>فيوز 10A</b>، وبعده <b>موديول حماية البطارية</b> بيفصل كل حاجة تحت 11.8V. والكود نفسه رافض يحرّك الموتور تحت 12V.' }
  ],
  cards: [
    { kind: 'warn', title: '🚗 للعربية الراكنة بس', body: 'لازم تلف الغطا <b>وتشيل الأسطوانة</b> قبل ما تتحرك. ولو فيه عاصفة، لفّه.' },
    { kind: 'ok', title: '♻️ من بواقي الكيتات', body: 'الأردوينو والـ P6KE18A والمكثفات ومقسّم الجهد 47k/10k نفس اللي في كيت الطرمبة.' },
    { kind: 'danger', title: '🧲 التثبيت على السقف', body: 'أخطر جزء في المشروع. جرّبه والعربية واقفة في هوا قبل ما تعتمد عليه، ومتسوقش بيه أبداً.' }
  ]
}

export const pinouts: PinoutDef = {
  title: 'الأطراف والقطبية',
  sub: 'كل الموديولات جاهزة، بس كل واحد ليه أطراف لازم تتعرف.',
  chips: [],
  polarity: [
    { title: '⚙️ BTS7960', body: '<b>B+ وB−</b>: 12V من بعد الفيوز.<br><b>M+ وM−</b>: الموتور.<br><b>RPWM</b> ← D9 و<b>LPWM</b> ← D10.<br><b>R_EN وL_EN</b> ← D7 مع بعض.<br><b>R_IS وL_IS</b> ← A0 مع بعض، ومقاومة 1kΩ من A0 للأرضي.<br><b>VCC</b> ← 5V و<b>GND</b> ← GND.' },
    { title: '🧲 حساس Hall (A3144)', body: 'الوش المكتوب عليه قدامك والرجول لتحت: <b>1 = VCC</b> (5V)، <b>2 = GND</b>، <b>3 = OUT</b> ← D2. الخرج Open-collector: الكود بيشغّل الـ Pull-up الداخلي.' },
    { title: '📻 مستقبل الريموت YK04', body: '<b>VT</b> مش محتاجه. <b>D0</b> (زرار A) ← D4، <b>D1</b> (B) ← D5، <b>D2</b> (C) ← D6. <b>+</b> على 5V و<b>−</b> على GND.' },
    { title: '🔘 سويتش القفل', body: 'Micro switch بذراع وعجلة: <b>COM</b> ← GND و<b>NO</b> ← D3. بيتقفل لما السيخ اللي في طرف الغطا يخبط فيه.' },
    { title: '🔋 موديول حماية البطارية', body: 'مكتوب عليه <b>BAT+ BAT−</b> (من الفيوز) و<b>LOAD+ LOAD−</b> (لباقي الدايرة). اظبطه على <b>فصل 11.8V</b> و<b>رجوع 12.6V</b>.' },
    { title: '📏 مقسّم الجهد', body: '47kΩ من +12V لـ A1، و10kΩ من A1 للأرضي. 12.6V بتبقى <b>2.2V</b> على A1.' }
  ]
}

const FRONT: Pt[] = [[300, 98], [205, 104], [145, 156], [65, 164], [55, 214]]
const REAR: Pt[] = [[300, 98], [395, 104], [455, 156], [535, 164], [545, 214]]

const segLength = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1])

function partial(points: Pt[], frac: number): Pt[] {
  const total = points.slice(1).reduce((sum, p, i) => sum + segLength(points[i], p), 0)
  const want = total * Math.max(0, Math.min(1, frac))
  const out: Pt[] = [points[0]]
  let used = 0
  for (let i = 1; i < points.length; i++) {
    const len = segLength(points[i - 1], points[i])
    if (used + len >= want) {
      const k = len === 0 ? 0 : (want - used) / len
      return [...out, [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k]]
    }
    used += len
    out.push(points[i])
  }
  return out
}

const pathOf = (pts: Pt[]): string => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')

function coverLayer(frac: number): string {
  return [FRONT, REAR].map(line => `<path d="${pathOf(partial(line, frac))}" fill="none" stroke="#cfd6e0" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity=".92"/>`).join('')
}

const CAR_BODY = 'M60 215 L70 170 L150 158 L210 108 L390 108 L450 158 L530 168 L540 215 Z'

function wheel(cx: number): string {
  return `<circle cx="${cx}" cy="218" r="30" fill="#151922" stroke="#3a4255" stroke-width="4"/><circle cx="${cx}" cy="218" r="11" fill="#566179"/>`
}

function roller(drive: number): string {
  const spin = drive === 0 ? '' : `<animateTransform attributeName="transform" type="rotate" from="0 300 92" to="${drive > 0 ? 360 : -360} 300 92" dur="1.5s" repeatCount="indefinite"/>`
  return `<rect x="262" y="78" width="76" height="28" rx="14" fill="#2a3242" stroke="#9aa6bd" stroke-width="2"/>` +
    `<g><line x1="300" y1="82" x2="300" y2="102" stroke="#ffb547" stroke-width="3"/>${spin}</g>`
}

function statusLine(s: CoverState): string {
  const color = FAULTS.has(s.ctl.mode) || !s.powered ? '#ff5d5d' : s.motorAmps > 0 ? '#ffb547' : '#3ddc84'
  return `<text x="300" y="285" text-anchor="middle" fill="${color}" font-size="16" font-weight="800">${stateText(s)}</text>` +
    `<text x="300" y="40" text-anchor="middle" fill="#9aa6bd" font-size="13">${Math.round(openPct(s))}% مفرود · ${s.ctl.turns}/${FULL_TURNS} لفة · ${s.motorAmps.toFixed(1)}A</text>`
}

function carScene(s: CoverState): string {
  const drive = s.motorAmps > 0 ? driveOf(s.ctl) : 0
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/><line x1="20" y1="248" x2="580" y2="248" stroke="#2a3242" stroke-width="3"/>` +
    `<path d="${CAR_BODY}" fill="#3b4a66" stroke="#566179" stroke-width="2"/>` +
    `<path d="M218 116 L292 116 L292 150 L176 150 Z M308 116 L382 116 L424 150 L308 150 Z" fill="#1b2333"/>` +
    wheel(150) + wheel(450) + coverLayer(openPct(s) / 100) + roller(drive) + statusLine(s) + `</svg>`
}

export const livePreview: LivePreviewDef<CoverParams, CoverState> = {
  render: s => carScene(s),
  note: 'ده الغطا على العربية: دوس على الريموت وشوف الأسطوانة بتفرد النصين مع بعض. جرّب عطل وشوف الكود بيوقّف الموتور. جهد البطارية من تبويب <b>المحاكي</b>.',
  toggles: [{
    label: 'الريموت',
    options: [{ v: CMD_OPEN, text: '▲ افرد' }, { v: CMD_CLOSE, text: '▼ لِف' }, { v: CMD_STOP, text: '■ وقّف' }],
    get: p => p.target,
    set: (p, v) => ({ ...p, target: [CMD_OPEN, CMD_CLOSE, CMD_STOP].includes(v) ? v : CMD_CLOSE })
  }, {
    label: 'عطل',
    options: [{ v: FAULT_NONE, text: '✅ سليم' }, { v: FAULT_JAM, text: '🧱 زنقة' }, { v: FAULT_HALL_DEAD, text: '🧲 Hall فاصل' }, { v: FAULT_HOME_DEAD, text: '🔘 سويتش فاصل' }],
    get: p => p.fault,
    set: (p, v) => ({ ...p, fault: [FAULT_NONE, FAULT_JAM, FAULT_HALL_DEAD, FAULT_HOME_DEAD].includes(v) ? v : FAULT_NONE })
  }]
}

export const footer = 'صُمم كدليل تعليمي، مستوحى من Apex AutoCover. فيوز 10A على سلك البطارية، والعربية راكنة بس. · Arduino Nano · BTS7960 · A3144 · YK04'

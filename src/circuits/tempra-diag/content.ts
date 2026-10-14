import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import { dipTopViewSvg, to92Svg, type PinRole } from '../../lib/pinouts'
import { panelSvg } from './panel'
import { displayPhase } from '../../tempra/session'
import { OFF, ON, PHASE_TEXT, screenLines, type TempraParams, type TempraState } from './simulate'

export const APP_HREF = '?app=tempra'

export const hero: HeroMeta = {
  tag: 'مشروع DIY · فيات تمبرا 1993 · Bosch Mono-Motronic MA1.7',
  titleHtml: 'جهاز تشخيص<br><span class="grad">فيات تمبرا</span> + برنامج مجاني',
  lead: 'اقرا بيانات كمبيوتر المحرك والأعطال المسجلة فيه من خط K، من غير أي برنامج بفلوس. ابدأ بكابل KKL والبرنامج المجاني على المتصفح، وبعدين ابني الجهاز المحمول بشاشته. كله قراية بس: مفيش مسح أعطال ولا تشغيل أجزاء.',
  stats: [
    { value: '0 ج', label: 'البرنامج (Chrome / Edge)' },
    { value: '4800', label: 'سرعة خط K (baud)' },
    { value: 'قراية بس', label: 'مفيش مسح ولا تشغيل' },
    { value: '≈ 550 ج', label: 'الجهاز المحمول (من غير الملتيميتر)' }
  ],
  bulbCaption: 'اللمبة بتنوّر لما الاتصال بالكمبيوتر ينجح · المحاكي شغال ↓'
}

const PROTOCOL_TABLE = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;direction:ltr">' +
  '<tr><th>Step</th><th>Bytes</th><th>Meaning</th></tr>' +
  '<tr><td>Wake-up</td><td><code>0x10</code> at 5 baud</td><td>200 ms per bit, LSB first</td></tr>' +
  '<tr><td>ECU sync</td><td><code>55 k1 k2 …</code></td><td>then 4800 baud</td></tr>' +
  '<tr><td>Key reply</td><td><code>~k2</code></td><td>inverse of the third byte</td></tr>' +
  '<tr><td>Block</td><td><code>len cnt title data… 03</code></td><td>every byte but <code>03</code> is answered with its inverse</td></tr>' +
  '<tr><td>Read faults</td><td><code>07</code> → <code>FC</code>…</td><td>raw code bytes + status</td></tr>' +
  '<tr><td>Read sensors</td><td><code>12</code> → <code>F4</code></td><td>10 raw bytes</td></tr>' +
  '<tr><td>Keep-alive</td><td><code>09</code> every 0.5 s</td><td>the ECU drops the link after 1 s</td></tr>' +
  '</table></div><p>المصادر والحالة (متأكد / مش متأكد) لكل سطر في <code>docs/tempra-protocol.md</code>.</p>'

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'كمبيوتر المحرك في التمبرا 1.6 SPI (Bosch <b>0 261 200 721</b>) بيتكلم على سلك واحد اسمه خط K. احنا بنصحّيه، ونتصافح معاه، ونطلب منه يقرالنا. مفيش أي أمر بيغيّر حاجة.',
  stages: [
    { icon: '📏', stage: 'المرحلة 1', title: 'اقيس الفيشة', body: 'الفيشة أم 3 رجول جنب الكمبيوتر. بالملتيميتر بس: رجل الأرضي (≈0Ω) ورجل خط K (≈12V والمفتاح ON). <b>من غير القياس ده مفيش توصيل.</b>' },
    { icon: '💻', stage: 'المرحلة 2', title: 'كابل KKL + البرنامج', body: 'كابل USB جاهز (شريحة FTDI) + أدابتر فيات 3 رجول. افتح <a href="' + APP_HREF + '">البرنامج</a> في Chrome أو Edge: بيصحّي الكمبيوتر ويقرا التعريف والأعطال، وبيسجّل كل بايت في ملف.' },
    { icon: '🔧', stage: 'المرحلة 3', title: 'الجهاز المحمول', body: 'ESP32 + LM393 + 2N2222A + LM2596 على بورد نقط أو خطوط، وشاشة OLED و3 زراير. بيتكلّم مع الموبايل بالـ <b>Wi-Fi</b> (أي موبايل) أو <b>البلوتوث</b> (أندرويد)، من غير إنترنت.' },
    { icon: '🧪', stage: 'المرحلة 4', title: 'نتأكد من البروتوكول', body: 'ملف السجل من عربيتك بيتقارن بقواعد البروتوكول. أي اختلاف بيتصلّح في البرنامج والجهاز الاتنين، وبعدها بس نضيف معاني الأكواد.' }
  ],
  cards: [
    { kind: 'ok', title: '▶ البرنامج المجاني', body: '<a class="btn pri" href="' + APP_HREF + '">افتح البرنامج</a><p>Chrome أو Edge على كمبيوتر، عربي وإنجليزي. فيه <b>وضع تجربة</b> بكمبيوتر محاكَى تجرّبه من غير كابل ولا عربية. بيشتغل مع كابل KKL على الكمبيوتر، ومع الجهاز المحمول من الموبايل بالـ Wi-Fi (أي موبايل) أو البلوتوث (Chrome على أندرويد).</p>' },
    { kind: 'ok', title: '🔒 قراية بس', body: 'الطلبات اللي في الكود 3 بس: الأعطال، والحساسات، وقراية ذاكرة. مفيش طريقة في الكود تبعت أمر مسح الأعطال (<code>05</code>) أو تشغيل الأجزاء (<code>04</code>)، وفيه اختبار بيتأكد من ده.' },
    { kind: 'danger', title: '⚠ لسه مجرّبش على عربية', body: 'البروتوكول متجمّع من مشروع مفتوح شغال على فيات تيبو ومن مرجع لنفس عيلة Bosch. البرنامج والجهاز متجرّبين على <b>كمبيوتر محاكَى</b> بس. أول توصيل حقيقي هو اللي هيأكد سرعة 4800 والأكواد.' },
    { kind: 'warn', title: '🩺 تقرير الأعطال', body: 'كل كود بيتعرض كتقرير: الجزء، والمعنى، والأسباب المحتملة، وإزاي تتأكد بأمان، والبايتات الخام. المعاني من جدول منتدى لعربيات تيبو (11 كود)، فكل تقرير مكتوب عليه <b>غير مؤكد</b> لحد ما نتأكد على التمبرا. متغيّرش قطعة على كود واحد.' },
    { kind: 'ok', title: '📡 البروتوكول كله', body: PROTOCOL_TABLE },
    { kind: 'ok', title: '🧪 الكود متجرّب', body: 'البروتوكول بـ <code>npm run test:firmware:tempra</code> (C++) و<code>npm test</code> (البرنامج). الاختبارات بتكسر الكود عن قصد وتتأكد إنها بتمسك الغلط.' }
  ]
}

const ESP32: Record<number, PinRole> = {
  1: ['EN', '#4a5470'], 2: ['VP', '#4a5470'], 3: ['VN', '#4a5470'], 4: ['D34 ← البطارية', '#fbbf24'], 5: ['D35', '#4a5470'],
  6: ['D32 ← صفحة', '#c084fc'], 7: ['D33 ← حساسات', '#c084fc'], 8: ['D25 ← أعطال', '#c084fc'], 9: ['D26 → R2 (إرسال)', '#f472b6'], 10: ['D27 ← LM393 (استقبال)', '#5aa9ff'],
  11: ['D14 → SCL', '#10b981'], 12: ['D12 متلمسوش', '#64748b'], 13: ['D13 ↔ SDA', '#22d3ee'], 14: ['GND', '#9aa6bd'], 15: ['VIN ← 5V', '#ff9f43'],
  16: ['3V3 → VCC الشاشة', '#ff9f43'], 17: ['GND', '#9aa6bd'], 18: ['D15 متلمسوش', '#64748b'], 19: ['D2 (LED)', '#4a5470'], 20: ['D4', '#4a5470'],
  21: ['RX2', '#4a5470'], 22: ['TX2', '#4a5470'], 23: ['D5 متلمسوش', '#64748b'], 24: ['D18', '#4a5470'], 25: ['D19', '#4a5470'],
  26: ['D21', '#4a5470'], 27: ['RX0', '#4a5470'], 28: ['TX0', '#4a5470'], 29: ['D22', '#4a5470'], 30: ['D23', '#4a5470']
}

const LM393: Record<number, PinRole> = {
  1: ['OUT → D27، R8', '#5aa9ff'], 2: ['IN− ← خط K / R4', '#ffb547'], 3: ['IN+ ← R6، R7', '#fbbf24'], 4: ['GND', '#9aa6bd'],
  5: ['IN+ B → GND', '#64748b'], 6: ['IN− B → GND', '#64748b'], 7: ['OUT B (فاضي)', '#64748b'], 8: ['VCC ← 5V', '#ff9f43']
}

export const pinouts: PinoutDef = {
  title: 'الرجول والقطبية',
  sub: 'بوردة ESP32 أم 30 رجل. البوردات بتختلف: <b>امشي على المكتوب جنب الرجل (D34، D26 …)، مش على مكانها</b>.',
  chips: [
    dipTopViewSvg('ESP32 DevKit (30 رجل)', 'ESP32-WROOM-32', ESP32, 'الهوائي فوق · الـ USB تحت'),
    dipTopViewSvg('LM393', 'LM393', LM393, 'العلامة (النص دايرة) فوق'),
    to92Svg('2N2222A', ['E', 'B', 'C'], ['الأرضي', 'من R2', 'خط K'], '⚠ BC547 رجوله معكوسة (C B E)')
  ],
  polarity: [
    { title: '▶| الدايودات', body: 'الشريطة = <b>الكاثود</b>.<br>1N5408 (D1): الشريطة ناحية VK (بعيد عن الفيوز).<br>P6KE18A (D2، D3): الشريطة على VK أو خط K، والتاني على الأرضي.' },
    { title: '🔋 C1 100µF', body: 'الرجل <b>الطويلة = +</b> على VK.' },
    { title: '⚡ LM2596', body: 'IN+ وIN− من VK والأرضي، وOUT+ لـ VIN. <b>اظبط الخرج 5.00V بالتريمر قبل ما توصّل الـ ESP32.</b>' },
    { title: '🔥 R1 470Ω 1W', body: 'بتسخن شوية لو خط K فضل واطي. سيبها مرفوعة عن البورد 3 مم.' },
    { title: '📟 الشاشة', body: 'VCC على <b>3V3</b>، وGND، وSDA على <b>D13</b>، وSCL على <b>D14</b> (مش 21 و22: الكود بيحددهم). العنوان غالباً <code>0x3C</code>.' }
  ]
}

function caption(s: TempraState, p: TempraParams): string {
  if (p.key === OFF) return 'المفتاح مقفول: الكمبيوتر مش هيرد. الجهاز هيحاول كل كام ثانية'
  const phase = displayPhase(s.session)
  if (phase === 'ready' && !s.faults) return 'متوصل · دوس "أعطال" أو "حساسات"'
  return PHASE_TEXT[phase]
}

export const livePreview: LivePreviewDef<TempraParams, TempraState> = {
  render: (s, p) => panelSvg({
    screen: screenLines(s, p),
    connected: s.session.phase === 'ready' || s.session.phase === 'link',
    keyOn: p.key === ON,
    kLow: s.kLow,
    talker: s.talker,
    caption: caption(s, p)
  }),
  note: 'دوس <b>وصّل من الأول</b> وبص على تبويب المحاكي: الإيقاظ بياخد حوالي 2 ثانية لحد ما الشاشة تكتب <b>READY</b>، وبعدين دوس <b>أعطال</b>. البيانات <b>مثال</b> من كمبيوتر محاكَى. نفس الحاجة على عربيتك من <a href="' + APP_HREF + '">البرنامج</a>.',
  toggles: [
    {
      label: 'المفتاح',
      options: [{ v: ON, text: '🔑 ON' }, { v: OFF, text: 'مقفول' }],
      get: p => p.key,
      set: (p, v) => ({ ...p, key: v === OFF ? OFF : ON })
    },
    {
      label: 'صفحة',
      options: [{ v: 1, text: '📄 صفحة' }],
      get: () => -1,
      set: p => ({ ...p, pageSeq: p.pageSeq + 1 })
    },
    {
      label: 'من الأول',
      options: [{ v: 1, text: '🔄 وصّل من الأول' }],
      get: () => -1,
      set: p => ({ ...p, restartSeq: p.restartSeq + 1 })
    },
    {
      label: 'أعطال',
      options: [{ v: 1, text: '📋 اقرا الأعطال' }],
      get: () => -1,
      set: p => ({ ...p, faultsSeq: p.faultsSeq + 1 })
    },
    {
      label: 'حساسات',
      options: [{ v: 1, text: '📈 اقرا الحساسات' }],
      get: () => -1,
      set: p => ({ ...p, sensorsSeq: p.sensorsSeq + 1 })
    }
  ]
}

export const footer = 'برنامج وجهاز قراية بس: مفيش مسح أعطال ولا تشغيل أجزاء. متوصّلش أي حاجة قبل ما تقيس الفيشة بالملتيميتر، ومتوصّلش والمفتاح ON. · Bosch MA1.7 · خط K · ESP32 · LM393 · Web Serial'

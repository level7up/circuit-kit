import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import { dipTopViewSvg, to220Svg, type PinRole } from '../../lib/pinouts'
import { BENCH_PROFILE, FAULT_LATCHED, READY, lcdLines, outputsOf } from './controller'
import { panelSvg } from './panel'
import { KNOB_STEPS, OFF, ON, PRESS_LONG, PRESS_SHORT, SENSOR_SPAN_V, SENSOR_ZERO_V, stateText, type FuelParams, type FuelState } from './simulate'

const P = BENCH_PROFILE

export const hero: HeroMeta = {
  tag: 'مشروع DIY · على المكتب بس · Arduino Nano · مفيش بنزين',
  titleHtml: 'متحكم أمان<br>لـ<span class="grad">طرمبة البنزين</span> (نموذج مكتب)',
  lead: 'نموذج تدريب لمنطق الأمان في متحكم طرمبة EFI: مقبض بيطلب أمر، وحساس ضغط بيتراقب، وأي عطل يقفل الخرج ويفضل مقفول لحد Reset مقصود. الطرمبة هنا <b>لمبة 5W</b>، والحساس <b>بوتنشيومتر</b>. مش للعربية ومش لبنزين حقيقي.',
  stats: [
    { value: '5 حالات', label: 'OFF · TEST · READY · RUN · FAULT' },
    { value: '7 أعطال', label: 'كلها بتقفل الخرج' },
    { value: '250 ms', label: 'Watchdog' },
    { value: '0 بنزين', label: 'لمبة بدل الطرمبة' }
  ],
  bulbCaption: 'المحاكي شغال لايف ↓'
}

const FAULT_TABLE = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
  '<tr><th>الكود</th><th>معناه</th><th>بيتكشف إمتى</th></tr>' +
  '<tr><td>F1</td><td>الحساس مقطوع</td><td>أقل من 0.25V لمدة 100 ms</td></tr>' +
  '<tr><td>F2</td><td>الحساس لامس 5V</td><td>أكتر من 4.75V لمدة 100 ms</td></tr>' +
  '<tr><td>F3</td><td>ضغط عالي</td><td>أكتر من ' + P.pressureHighPct + '% في أي حالة</td></tr>' +
  '<tr><td>F4</td><td>ضغط واطي</td><td>أقل من ' + P.pressureLowPct + '% بعد ' + P.primeMs / 1000 + ' ثانية تشغيل</td></tr>' +
  '<tr><td>F5</td><td>عطل في الخرج</td><td>S1 مفتوح والموسفت مقفول بس الـ Drain مش عالي</td></tr>' +
  '<tr><td>F6</td><td>Watchdog</td><td>الكود هنّج أكتر من 250 ms</td></tr>' +
  '<tr><td>F7</td><td>بروفايل غلط</td><td>الحدود في الكود مش منطقية (مبيتمسحش بالزرار)</td></tr>' +
  '</table></div><p>كل عطل: الخرج يقفل، والحمرا تنوّر، والكود يتسجّل في الـ EEPROM. Reset = <b>ضغطة طويلة ثانيتين</b> بعد ما السبب يروح والمقبض على الصفر، وبعدها Self test من الأول.</p>'

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'حالة واحدة بس فيها الخرج شغال (RUNNING)، ومش بتتدخل غير بدوسة مقصودة.',
  stages: [
    { icon: '🛡️', stage: 'المرحلة 1', title: 'الكهربا والحماية', body: 'أدابتر 12V بـ <b>فيوز 2A</b>، و<b>1N5408</b> ضد عكس السلوك، و<b>P6KE18A</b> ضد النبضات. الأردوينو بياخد من VIN.' },
    { icon: '📏', stage: 'المرحلة 2', title: 'الإحساس', body: 'الحساس (بوتنشيومتر 0.5–4.5V) على <b>A0</b> بفلتر و<b>100k</b> لو اتقطع. المقبض على <b>A1</b>. ومقسّمين بيقولوا للأردوينو S1 مفتوح ولا لأ (<b>A2</b>) والـ Drain فيه كهربا ولا لأ (<b>A3</b>).' },
    { icon: '🧠', stage: 'المرحلة 3', title: 'الكود', body: 'كل 10 ms: يقرا، ويفلتر، ويقارن بالبروفايل. <b>DISABLED ← SELF TEST ← READY ← RUNNING</b>، وأي عطل ← <b>FAULT</b> لحد Reset مقصود. والـ Watchdog بيعمل Reset لو الكود هنّج.' },
    { icon: '⚡', stage: 'المرحلة 4', title: 'الخرج', body: '<b>D9</b> ← 220Ω ← <b>IRLZ44N</b> بيوصّل − اللمبة للأرضي. <b>100k</b> بيقفل البوابة لو الأردوينو مش شغال. و<b>S1</b> بيقطع كهربا اللمبة بإيده.' }
  ],
  cards: [
    { kind: 'danger', title: '⛽ ليه مش على طرمبة حقيقية؟', body: 'الطرمبات بتختلف في طريقة التحكم المسموحة، والضغط بيختلف من موتور لموتور، وقلة الضغط ممكن تخلي الخليط فقير وتأذي الموتور. حساس الضغط لوحده <b>مش بيثبت</b> إن الخليط سليم. عشان كده الكيت بيقف عند المكتب، وآخر خطوة فيه أسئلة لازم إجاباتها تبقى مكتوبة قبل أي حاجة حقيقية.' },
    { kind: 'warn', title: '📐 الأرقام دي مش بار', body: 'الحدود في <code>BENCH_PROFILE</code> (25% و85% و30–80% للخرج) <b>نسبة من مدى الحساس</b> عشان التدريب. مفيش رقم ضغط بنزين في الكيت، ومتنقلهاش لأي سيستم حقيقي.' },
    { kind: 'ok', title: '📋 جدول الأعطال', body: FAULT_TABLE },
    { kind: 'ok', title: '🧯 مين بيطفّي إيه', body: 'الكود بيطفّي في كل الأعطال. <b>R11</b> بتطفّي لو الأردوينو فاصل أو بيعمل Reset. <b>الفيوز</b> لو في قصر. و<b>S1</b> هو الوحيد اللي بيطفّي لو الموسفت نفسه ضارب: جرّبه في المحاكي.' },
    { kind: 'ok', title: '🧪 الكود متجرّب', body: 'منطق الكود (<code>controller.h</code>) بيتجرّب على الكمبيوتر بـ <code>npm run test:firmware</code>، ونفس القواعد في المحاكي بتتجرّب بـ <code>npm test</code>.' }
  ]
}

const NANO: Record<number, PinRole> = {
  1: ['D1 TX', '#4a5470'], 2: ['D0 RX', '#4a5470'], 3: ['RST', '#4a5470'], 4: ['GND', '#9aa6bd'], 5: ['D2 ← الزرار', '#a3e635'],
  6: ['D3', '#4a5470'], 7: ['D4', '#4a5470'], 8: ['D5', '#4a5470'], 9: ['D6', '#4a5470'], 10: ['D7 ← الخضرا', '#4ade80'],
  11: ['D8 ← الحمرا', '#ef4444'], 12: ['D9 ← بوابة Q1', '#f472b6'], 13: ['D10', '#4a5470'], 14: ['D11', '#4a5470'], 15: ['D12', '#4a5470'],
  16: ['D13', '#4a5470'], 17: ['3V3', '#4a5470'], 18: ['AREF', '#4a5470'], 19: ['A0 ← الحساس', '#5aa9ff'], 20: ['A1 ← المقبض', '#c084fc'],
  21: ['A2 ← S1', '#fbbf24'], 22: ['A3 ← الـ Drain', '#fca5a5'], 23: ['A4 SDA', '#34d399'], 24: ['A5 SCL', '#10b981'], 25: ['A6', '#4a5470'],
  26: ['A7', '#4a5470'], 27: ['5V ← اللوحة', '#ff9f43'], 28: ['RST', '#4a5470'], 29: ['GND', '#9aa6bd'], 30: ['VIN ← 12V', '#ffb547']
}

export const pinouts: PinoutDef = {
  title: 'الرجول والقطبية',
  sub: 'الأردوينو بالترقيم بتاع الـ DIP: رجل 1 جنب VIN، والـ USB في الناحية التانية.',
  chips: [
    dipTopViewSvg('Arduino Nano', 'Arduino Nano', NANO, 'الـ USB تحت في الرسمة · يمين على البورد'),
    to220Svg('IRLZ44N', ['G', 'D', 'S'], ['من R10', '− اللمبة', 'أرضي'], 'الطبق = D', '#2563eb')
  ],
  polarity: [
    { title: '▶| الدايودات', body: 'الشريطة = <b>الكاثود</b>.<br>1N5408: الشريطة ناحية الأردوينو.<br>P6KE18A: الشريطة على +12V.' },
    { title: '🔋 C1 100µF', body: 'الرجل <b>الطويلة = +</b>.' },
    { title: '🎛️ البوتنشيومتر', body: 'الرجل الوسطانية = الإشارة. لو اللف معكوس (يمين بيقلّل)، بدّل الطرفين 5V وGND.' },
    { title: '💡 اللمبات LED', body: 'الطويلة على RUN أو FLT، والقصيرة على أرضي اللوحة.' },
    { title: '📟 الشاشة I2C', body: 'GND وVCC وSDA وSCL مكتوبين على الموديول اللي ورا. VCC على <b>5V</b>.' }
  ]
}

const sensorPctOf = (s: FuelState): number => Math.max(0, Math.min(100, ((s.sensorV - SENSOR_ZERO_V) * 100) / SENSOR_SPAN_V))

function caption(s: FuelState, p: FuelParams): string {
  if (!s.mcuOn) return 'الأدابتر مفصول'
  if (s.hungAtMs !== null) return '⏳ الكود هنّج: الـ Watchdog هيعمل Reset'
  if (s.ctl.state === FAULT_LATCHED) return '⛔ عطل: صلّح السبب، والمقبض صفر، وضغطة طويلة'
  if (s.lamp > 0 && outputsOf(s.ctl).dutyPct === 0) return '⚠ اللمبة منوّرة والكود قافل: اقفل S1'
  if (p.knob > P.startKnobMaxPct && s.ctl.state === READY) return 'رجّع المقبض للصفر عشان تقدر تبدأ'
  return stateText(s)
}

export const livePreview: LivePreviewDef<FuelParams, FuelState> = {
  render: (s, p) => panelSvg({
    lcd: lcdLines(s.ctl),
    powered: s.mcuOn,
    run: s.mcuOn && outputsOf(s.ctl).runLed,
    fault: s.mcuOn && outputsOf(s.ctl).faultLed,
    lamp: s.lamp,
    arm: p.arm === ON,
    knobPct: p.knob,
    sensorPct: sensorPctOf(s),
    caption: caption(s, p)
  }),
  note: 'دي اللوحة اللي هتعملها. <b>دوسة</b> بتشغّل وبتوقّف، و<b>دوسة طويلة</b> بتمسح العطل. الأعطال نفسها من تبويب <b>المحاكي</b> ← "جرّب عطل".',
  toggles: [
    {
      label: 'الزرار',
      options: [{ v: PRESS_SHORT, text: '👆 دوسة' }, { v: PRESS_LONG, text: '✋ دوسة طويلة' }],
      get: () => -1,
      set: (p, v) => ({ ...p, press: v === PRESS_LONG ? PRESS_LONG : PRESS_SHORT, pressSeq: p.pressSeq + 1 })
    },
    {
      label: 'المقبض',
      options: KNOB_STEPS.map(v => ({ v, text: v + '%' })),
      get: p => p.knob,
      set: (p, v) => ({ ...p, knob: KNOB_STEPS.includes(v) ? v : 0 })
    },
    {
      label: 'S1',
      options: [{ v: ON, text: 'S1 ON' }, { v: OFF, text: 'S1 OFF' }],
      get: p => p.arm,
      set: (p, v) => ({ ...p, arm: v === OFF ? OFF : ON })
    },
    {
      label: 'الأدابتر',
      options: [{ v: ON, text: '🔌 متوصّل' }, { v: OFF, text: '⛔ مفصول' }],
      get: p => p.power,
      set: (p, v) => ({ ...p, power: v === OFF ? OFF : ON })
    }
  ]
}

export const footer = 'نموذج تدريب على المكتب لمنطق الأمان بس: لمبة بدل الطرمبة وبوتنشيومتر بدل الحساس. مش متوافق مع أي موتور، ومش متجرّب على بنزين ولا طرمبة ولا عربية، وممنوع يتوصّل بيهم من غير مراجعة واعتماد من متخصص للسيستم ده بالظبط. · Arduino Nano · IRLZ44N · 1N5408 · P6KE18A'

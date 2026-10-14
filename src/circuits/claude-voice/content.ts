import type { HeroMeta, LivePreviewDef, OverviewDef, PinoutDef } from '../../types/circuit'
import { stateLabel } from './device'
import { panelSvg } from './panel'
import { headerSvg } from './pinout'
import {
  CANCEL_PRESS_MS, MAX_SPOKEN_CHARS, OFF, ON, deviceShows, hostText, type VoiceParams, type VoiceState
} from './simulate'

export const hero: HeroMeta = {
  tag: 'مشروع DIY · ESP32-S3 + الماك · Claude Code',
  titleHtml: 'زرار <span class="grad">تكلّم بيه</span><br>Claude Code',
  lead: 'امسك الزرار واتكلم، وسيبه: الماك يحوّل كلامك لنص ويبعته لـ Claude Code، ويقرالك الرد بصوت عالي. الـ ESP32-S3 بيبعت ضغطات الزرار على الـ USB بس، وكل الشغل التاني على الماك.',
  stats: [
    { value: '1 زرار', label: 'امسك واتكلم' },
    { value: '9 سطور', label: 'كل بروتوكول الـ USB' },
    { value: '0 مفاتيح API', label: 'في الـ Firmware' },
    { value: '≈ 665 ج', label: 'أول مرحلة · لو عندك سماعة' }
  ],
  bulbCaption: 'الـ LED بتاعة الحالة · المحاكي شغال ↓'
}

const PROTOCOL_TABLE = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;direction:ltr">' +
  '<tr><th>Direction</th><th>Line</th><th>Meaning</th></tr>' +
  '<tr><td>device → Mac</td><td><code>BTN:PTT_DOWN</code></td><td>started holding the talk button</td></tr>' +
  '<tr><td>device → Mac</td><td><code>BTN:PTT_UP</code></td><td>released it</td></tr>' +
  '<tr><td>device → Mac</td><td><code>BTN:CANCEL</code></td><td>stop recording / thinking / speaking</td></tr>' +
  '<tr><td>device → Mac</td><td><code>DEV:READY</code></td><td>just booted</td></tr>' +
  '<tr><td>Mac → device</td><td><code>STATE:IDLE</code> … <code>STATE:ERROR</code></td><td>what to show, every change + once a second</td></tr>' +
  '</table></div><p>كل سطر بيخلص بـ <code>\\n</code>. أي سطر مش في الجدول ده بالظبط، أو أطول من 24 حرف على الجهاز (32 على الماك)، بيترمي. <b>مفيش سطر بيتنفّذ كأمر.</b></p>'

export const overview: OverviewDef = {
  title: 'الفكرة بتشتغل إزاي؟',
  sub: 'الجهاز غبي عن قصد: زرارين وLED. كل حاجة فيها ذكاء أو صوت أو صلاحيات على الماك.',
  stages: [
    { icon: '🔘', stage: 'المرحلة 1', title: 'الزرار', body: 'زرار على <b>GPIO4</b> وزرار Cancel على <b>GPIO5</b>، الاتنين للأرضي بـ <b>Pull-up داخلي</b>. الكود بيعمل <b>Debounce 25 ms</b> وبيبعت سطر واحد لكل ضغطة.' },
    { icon: '🔌', stage: 'المرحلة 2', title: 'الـ USB', body: 'الـ ESP32-S3 بيظهر على الماك كـ Serial port. بيبعت <code>BTN:PTT_DOWN</code> و<code>BTN:PTT_UP</code>، وبياخد <code>STATE:…</code> عشان الـ LED.' },
    { icon: '🎙️', stage: 'المرحلة 3', title: 'الماك', body: 'برنامج Python بيسجّل بـ <b>ffmpeg</b>، ويحوّل لنص بـ <b>whisper.cpp</b> على الجهاز نفسه، ويبعت النص لـ <code>claude -p</code> في فولدر المشروع.' },
    { icon: '🔊', stage: 'المرحلة 4', title: 'الرد', body: 'الرد بيتطبع كامل على الشاشة، وأول ' + MAX_SPOKEN_CHARS + ' حرف بيتقروا بـ <code>say</code> من غير الكود. Cancel أو ضغطة كلام جديدة بتوقف القراية.' }
  ],
  cards: [
    { kind: 'ok', title: '📡 البروتوكول كله', body: PROTOCOL_TABLE },
    { kind: 'warn', title: '🔐 الصلاحيات زي ما هي', body: 'البرنامج بيشغّل <code>claude -p</code> من غير أي flag بيدي صلاحيات. أي أداة محتاجة إذن بتترفض في الوضع ده لحد ما <b>انت</b> تسمح بيها في إعدادات Claude Code. الصوت عمره ما بيوافق على حاجة بدالك.' },
    { kind: 'warn', title: '🎙️ /voice مش API', body: 'الـ <code>/voice</code> اللي جوه Claude Code بيكتب كلامك في الجلسة اللي مفتوحة، بس مش معمول عشان جهاز بره يتحكم فيه أو يقرا الرد. عشان كده البرنامج بيستخدم <code>claude -p --output-format json</code>، وده موثّق ومستقر. جرّب <code>/voice</code> بإيدك الأول (الخطوة 1).' },
    { kind: 'ok', title: '🕵️ الخصوصية', body: 'التسجيل بيبدأ بس وانت ماسك الزرار. ملف الصوت بيتمسح بعد ما يتحوّل لنص إلا لو فعّلت <code>keep_audio</code>. السجل بيكتب الأحداث وطول الكلام بس، مش الكلام نفسه.' },
    { kind: 'ok', title: '🧪 الكود متجرّب', body: 'منطق الـ Firmware (<code>device.h</code>) بيتجرّب بـ <code>npm run test:firmware:voice</code>، وبرنامج الماك بـ <code>npm run test:host</code>، والمحاكي ده بـ <code>npm test</code>.' }
  ]
}

export const pinouts: PinoutDef = {
  title: 'الرجول والقطبية',
  sub: 'بنستخدم الهيدر J1 بس. البوردات بتختلف: <b>امشي على المكتوب جنب الرجل (GPIO4 …)، مش على مكانها</b>.',
  chips: [headerSvg()],
  polarity: [
    { title: '🔘 الزرار', body: 'رجل على GPIO والتانية على <b>GND</b>. ملوش اتجاه. لو زرار 4 رجول: استخدم رجلين <b>قطريين</b>.' },
    { title: '💡 الـ LED', body: 'الرجل <b>الطويلة</b> ناحية المقاومة 330Ω (رايحة GPIO6)، والقصيرة على GND.' },
    { title: '⚡ 3.3V بس', body: 'رجول الـ ESP32-S3 <b>3.3V</b>. متوصّلش 5V على أي GPIO، ولا الـ OLED على 5V.' },
    { title: '🔌 أنهي USB؟', body: 'الأسهل: المنفذ المكتوب عليه <b>USB</b> مع <b>USB CDC On Boot: Enabled</b>. لو استخدمت <b>UART</b>، خليها Disabled.' },
    { title: '📟 OLED I2C', body: 'GND وVCC وSCL وSDA. VCC على <b>3V3</b>. العنوان غالباً <code>0x3C</code>.' }
  ]
}

function caption(s: VoiceState, p: VoiceParams): string {
  if (p.usb === OFF) return 'الكابل مفصول: البرنامج ألغى أي حاجة كانت شغالة ومستني الجهاز'
  if (p.app === OFF) return 'برنامج الماك مقفول: الـ LED بتغمز كل ثانيتين (NO HOST)'
  if (s.host === 'LISTENING') return '🎙️ بيسجّل… سيب الزرار لما تخلّص'
  if (s.host === 'PROCESSING') return '⏳ بيحوّل لنص وبيسأل Claude Code'
  if (s.host === 'SPEAKING') return '🔊 بيقرا الرد · Cancel أو ضغطة كلام جديدة توقفه'
  if (s.host === 'ERROR') return '⚠ حصلت مشكلة: الرسالة على شاشة الماك'
  if (s.host === 'CANCELLED') return '⛔ اتلغى'
  return 'امسك زرار الكلام واتكلم'
}

export const livePreview: LivePreviewDef<VoiceParams, VoiceState> = {
  render: (s, p) => panelSvg({
    powered: s.devOn,
    pttDown: p.ptt === ON && s.devOn,
    cancelDown: s.devOn && s.t * 1000 < s.cancelUntilMs,
    led: s.led,
    oled: s.devOn ? stateLabel(deviceShows(s)) : '',
    hostState: hostText(s, p),
    serial: s.serial,
    heard: s.heard,
    spoken: s.spokenChars ? s.reply.slice(0, s.spokenChars) : '',
    caption: caption(s, p)
  }),
  note: '<b>امسك</b> زرار الكلام، واستنى ثانية، و<b>سيبه</b>. السهم ↑ رسالة من الجهاز للماك و↓ العكس، والأحمر سطر اترمى. المشاكل نفسها من تبويب <b>المحاكي</b> ← "جرّب مشكلة".',
  toggles: [
    {
      label: 'زرار الكلام',
      options: [{ v: ON, text: '🎙️ امسك' }, { v: OFF, text: '✋ سيب' }],
      get: p => p.ptt,
      set: (p, v) => ({ ...p, ptt: v === ON ? ON : OFF })
    },
    {
      label: 'Cancel',
      options: [{ v: 1, text: '⛔ Cancel (' + CANCEL_PRESS_MS + ' ms)' }],
      get: () => -1,
      set: p => ({ ...p, cancelSeq: p.cancelSeq + 1 })
    },
    {
      label: 'USB',
      options: [{ v: ON, text: '🔌 متوصّل' }, { v: OFF, text: 'مفصول' }],
      get: p => p.usb,
      set: (p, v) => ({ ...p, usb: v === OFF ? OFF : ON })
    },
    {
      label: 'برنامج الماك',
      options: [{ v: ON, text: '💻 شغال' }, { v: OFF, text: 'مقفول' }],
      get: p => p.app,
      set: (p, v) => ({ ...p, app: v === OFF ? OFF : ON })
    }
  ]
}

export const footer = 'جهاز إدخال بس: الـ ESP32-S3 مبيكلّمش Claude ولا الإنترنت، ومفيهوش أي مفتاح. التسجيل والتحويل لنص وClaude Code والصوت كلهم على الماك، والصلاحيات زي ما انت ظابطها في Claude Code. · ESP32-S3 · Python · whisper.cpp · claude -p · say'

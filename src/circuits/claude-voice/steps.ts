import type { BuildStep } from '../../types/circuit'
import { buttonScene } from './scenes'

export const steps: BuildStep[] = [
  {
    t: 'جرّب على الماك من غير أي هاردوير',
    m: '⏱ 15 دقيقة · الماك بس',
    b: '<ol><li>في الـ Terminal: <code>claude --version</code>، وافتح <code>claude</code> وجرّب <code>/voice</code> بإيدك: اتكلم وشوف الكلام بيتكتب.</li><li>جرّب الصوت: <code>say "Hello, this is a speech test."</code></li><li>جرّب الطريقة اللي البرنامج هيستخدمها: <code>echo "say hi in five words" | claude -p --output-format json</code>. لازم يطلع JSON فيه <code>"result"</code>.</li><li>اكتب اللي لاحظته: <code>/voice</code> شغال؟ الرد بيطلع في <code>result</code>؟ الصوت مسموع؟</li></ol>',
    c: ['/voice شغال بإيدي', 'say بيتكلم', 'claude -p رجّع JSON فيه result', 'كتبت الملاحظات'],
    x: 'لو <code>claude -p</code> اشتغل، يبقى الطريق مضمون: البرنامج مش محتاج يقرا شاشة الـ Terminal ولا يلمس أي حاجة مش موثّقة. ولو مش شغال، <b>متشتريش هاردوير لسه</b>: صلّح تسجيل الدخول الأول.'
  },
  {
    t: 'جهّز برنامج الماك وجرّبه بالكيبورد',
    m: '⏱ 30 دقيقة · Homebrew + Python 3.11',
    b: '<ol><li><code>brew install ffmpeg whisper-cpp</code></li><li>نزّل موديل: <code>mkdir -p ~/.cache/whisper && curl -L -o ~/.cache/whisper/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin</code></li><li>من فولدر الكيت: <code>cd host && python3 -m venv .venv && source .venv/bin/activate && pip install -e .</code></li><li><code>claude-voice-terminal --keyboard --project ~/code/my-project</code>: <b>Enter</b> يبدأ التسجيل، و<b>Enter</b> تاني يبعته، و<code>c</code> + Enter يلغي.</li><li>أول مرة macOS هيسأل عن إذن المايك للـ Terminal: وافق.</li></ol>',
    c: ['ffmpeg وwhisper-cli متسطبين', 'الموديل نزل', 'Enter سجّل وبعت ورد', 'الرد اتقرا بصوت'],
    x: 'كده <b>المرحلة 0</b> في الخطة خلصت: الكلام بيوصل Claude Code والرد بيتقري، من غير ESP32. الزرار الحقيقي بعد كده مجرد بديل للـ Enter.'
  },
  {
    t: 'ارفع الكود على الـ ESP32-S3',
    m: '⏱ 20 دقيقة · البورد + كابل USB',
    b: '<ol><li>في Arduino IDE: Boards Manager ← <b>esp32 by Espressif</b>.</li><li>افتح <code>firmware/claude_voice_terminal/claude_voice_terminal.ino</code> (هو و<code>device.h</code> في نفس الفولدر).</li><li>Tools ← Board: <b>ESP32S3 Dev Module</b>، و<b>USB CDC On Boot: Enabled</b> لو هتستخدم المنفذ المكتوب عليه USB.</li><li>ارفع. لو الرفع مش راضي: امسك <b>BOOT</b> ودوس <b>RST</b> وسيب BOOT.</li><li>Serial Monitor على <b>115200</b> و<b>Newline</b>: دوس RST، لازم يطلع <code>DEV:READY</code>.</li></ol>',
    c: ['اخترت ESP32S3 مش ESP32', 'USB CDC On Boot مظبوط', 'DEV:READY ظهر'],
    x: 'اكتب في الـ Serial Monitor <code>STATE:LISTENING</code>: الكود بيقبلها. واكتب <code>rm -rf /</code>: مفيش حاجة تحصل. الجهاز بيفهم 5 سطور بس.'
  },
  {
    t: 'زرار الكلام على البريد بورد',
    m: '⏱ 15 دقيقة · زرار + سلكين',
    b: '<ol><li>الـ ESP32-S3 على البريد بورد (أو سيبه بره ووصّل بالسلوك).</li><li>رجل من الزرار على <b>GPIO4</b> والتانية على <b>GND</b>.</li><li>Serial Monitor: دوس وسيب. لازم يطلع <code>BTN:PTT_DOWN</code> مرة واحدة و<code>BTN:PTT_UP</code> مرة واحدة.</li><li>امسكه 10 ثواني: سطر DOWN واحد بس. دوس بسرعة 10 مرات: 10 DOWN و10 UP.</li><li><b>اقفل الـ Serial Monitor</b>: البرنامج مش هيعرف يفتح البورت وهو مفتوح.</li></ol>',
    c: ['DOWN وUP مرة واحدة لكل ضغطة', 'المسكة الطويلة مش بتكرر', 'قفلت الـ Serial Monitor'],
    x: 'لو طلع DOWN من غير ما تدوس: الزرار على رجلين متوصّلين على طول (زرار 4 رجول). استخدم رجلين قطريين.',
    scene: [buttonScene[0]]
  },
  {
    t: 'شغّل البرنامج مع الزرار',
    m: '⏱ 15 دقيقة · البورد + الماك',
    b: '<ol><li><code>claude-voice-terminal --list-ports</code>: البورد يظهر (Espressif أو <code>usbmodem</code>).</li><li><code>claude-voice-terminal --project ~/code/my-project</code></li><li>امسك الزرار واسأل سؤال قصير، وسيبه. البرنامج يكتب الحالات: LISTENING ← PROCESSING ← SPEAKING ← IDLE.</li><li>افصل الكابل وانت بتتكلم: البرنامج يلغي ويستنى. رجّعه: يكمّل لوحده.</li></ol>',
    c: ['البورت اتعرف لوحده', 'سؤال كامل اتسمع واترد عليه', 'فصل الكابل لغى ورجع لوحده'],
    x: 'كده الـ MVP في الخطة شغال: زرار حقيقي ← USB ← الماك ← Claude Code ← صوت.'
  },
  {
    t: 'الـ LED وزرار Cancel (والشاشة لو عايز)',
    m: '⏱ 30 دقيقة · زرار + LED + 330Ω + OLED اختياري',
    b: '<ol><li>Cancel: رجل على <b>GPIO5</b> والتانية على GND.</li><li>LED: <b>GPIO6</b> ← 330Ω ← الرجل الطويلة، والقصيرة على GND.</li><li>الـ LED: مطفية = READY، منوّرة = بيسمع، بترمش بسرعة = بيفكّر، ببطء = بيتكلم، ومضتين = ERROR، غمزة كل ثانيتين = البرنامج مقفول.</li><li>الشاشة (اختياري): VCC على <b>3V3</b>، وSDA على <b>GPIO8</b>، وSCL على <b>GPIO9</b>. نزّل <b>Adafruit SSD1306</b> و<b>Adafruit GFX</b>، وفي أول الكود خلي <code>#define VOICE_OLED 1</code>، وارفع تاني.</li></ol>',
    c: ['Cancel بيوقف التسجيل والتفكير والكلام', 'الـ LED بتتبع الحالة', 'الشاشة بتكتب الحالة (لو ركّبتها)'],
    x: 'اقفل البرنامج: بعد 3 ثواني الـ LED تبدأ تغمز كل ثانيتين. ده معناه إن الجهاز سليم بس محدش بيكلّمه.',
    scene: [buttonScene[1]]
  },
  {
    t: 'اختبارات القبول',
    m: '⏱ 45 دقيقة · سجّل النتيجة قدام كل سطر',
    b: '<ol><li><b>20 مرة ورا بعض</b> من غير ما تعيد تشغيل البرنامج.</li><li><b>Cancel</b> في كل حالة: وهو بيسمع، وهو بيفكّر، وهو بيتكلم. كل مرة يرجع READY.</li><li><b>ضغطة كلام وهو بيتكلم</b>: يسكت ويبدأ يسمع.</li><li><b>افصل الكابل</b> في كل حالة. ولا حالة تفضل معلّقة.</li><li><b>سؤال يحتاج تعديل ملف</b>: Claude Code لازم يرفض أو يطلب إذن. الصوت ميعدّلش حاجة لوحده.</li><li><b>الخصوصية</b>: <code>ls $TMPDIR/claude-voice-*</code> فاضي، والسجل مفيهوش كلامك.</li></ol>',
    c: ['20 مرة من غير مشاكل', 'Cancel شغال في الحالات الثلاثة', 'فصل الكابل مش بيعلّق حاجة', 'مفيش تعديل ملفات من غير إذن', 'مفيش ملفات صوت متسابة'],
    x: 'ده تعريف الـ "Done" في الخطة: كل حاجة بتتلغي، وكل عطل بيرجع READY، ومفيش أسرار ولا صلاحيات زيادة.'
  },
  {
    t: 'العلبة',
    m: '⏱ ساعة · علبة + جلاند',
    b: '<ol><li>زرار الكلام كبير وفي النص، وCancel أصغر وبعيد عنه عشان متدوسهمش مع بعض.</li><li>الـ LED (والشاشة) قدام عينك.</li><li><b>جلاند أو رباط</b> للكابل جوه العلبة عشان الشد ميوصلش لمنفذ الـ USB.</li><li>اقفل أي معدن عريان بشريط أو Heat shrink.</li></ol>',
    c: ['الزرارين ثابتين', 'الكابل مربوط', 'مفيش معدن عريان'],
    x: 'شد الكابل شدة خفيفة: البرنامج ميقولش إن الجهاز اتفصل.'
  }
]

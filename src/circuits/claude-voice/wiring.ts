import type { TroubleItem, WireGroup } from '../../types/circuit'

export const wiring: WireGroup[] = [
  {
    g: '🔘 الزرارين',
    i: ['زرار الكلام: رجل ← GPIO4، والتانية ← GND', 'زرار Cancel: رجل ← GPIO5، والتانية ← GND']
  },
  {
    g: '💡 الـ LED',
    i: ['GPIO6 ← مقاومة 330Ω ← الرجل الطويلة في الـ LED', 'الرجل القصيرة ← GND']
  },
  {
    g: '📟 الشاشة (اختياري)',
    i: ['VCC ← 3V3 (مش 5V)', 'GND ← GND', 'SDA ← GPIO8', 'SCL ← GPIO9']
  },
  {
    g: '🔌 الماك',
    i: ['كابل USB بيانات من منفذ USB في البورد للماك', 'مفيش أي مصدر كهربا تاني']
  }
]

export const trouble: TroubleItem[] = [
  {
    q: 'البرنامج بيقول مش لاقي الجهاز',
    a: ['الكابل شحن بس: جرّب كابل تاني بتنقل عليه ملفات.', 'الـ Serial Monitor في Arduino IDE مفتوح وماسك البورت: اقفله.', 'منفذ USB مع <b>USB CDC On Boot: Disabled</b>: يا تفعّلها وترفع تاني، يا تستخدم منفذ UART.', 'حدد البورت بإيدك: <code>--port /dev/cu.usbmodem…</code> (شوفه بـ <code>--list-ports</code>).']
  },
  {
    q: 'الزرار بيبعت DOWN وUP كذا مرة',
    a: ['الزرار متوصّل على رجلين متوصّلين جوه على طول، أو سلك سايب على البريد بورد.', 'الـ Debounce في الكود 25 ms: زرار بايظ جداً ممكن يحتاج أكتر. غيّر <code>DEBOUNCE_MS</code> في <code>device.h</code>.']
  },
  {
    q: 'الـ LED بتغمز كل ثانيتين',
    a: ['ده <b>NO HOST</b>: الجهاز مش بيسمع من البرنامج بقاله أكتر من 3 ثواني. شغّل البرنامج، أو شوف رسالة الخطأ اللي فيه.']
  },
  {
    q: 'بيسجّل بس بيقول مفيش كلام اتسمع',
    a: ['macOS رافض إذن المايك: System Settings ← Privacy & Security ← Microphone ← فعّل الـ Terminal.', 'المايك الغلط: <code>ffmpeg -f avfoundation -list_devices true -i ""</code> وحط رقمه في <code>microphone</code> في الإعدادات.', 'الموديل مش موجود في المسار اللي في <code>whisper_model</code>.']
  },
  {
    q: 'Claude Code بيرجّع خطأ',
    a: ['جرّب نفس السؤال بإيدك: <code>echo "hi" | claude -p --output-format json</code>.', 'مش متسجّل دخول: شغّل <code>claude</code> مرة وسجّل.', 'الطلب أخد أكتر من <code>claude_timeout_s</code>: زوّده أو اسأل أسئلة أقصر.']
  },
  {
    q: 'Claude بيقول إنه مش قادر يعدّل الملفات',
    a: ['ده مقصود: البرنامج مش بيدي أي صلاحيات. لو عايز تسمح بأداة معيّنة، ظبطها في إعدادات Claude Code بتاعة المشروع (<code>permissions.allow</code>)، مش في البرنامج.']
  },
  {
    q: 'الرد اتقطع في النص',
    a: ['البرنامج بيقرا أول <code>max_spoken_chars</code> حرف بس، والباقي على الشاشة. زوّده في الإعدادات لو عايز.']
  }
]

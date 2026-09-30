import type { WireGroup } from '../../types/circuit'

export const wiring: WireGroup[] = [
  {
    g: "🛡️ الباور والحماية",
    i: ["IN (أحمر) ← فيوز 1A ← أنود 1N4007", "كاثود 1N4007 (الشريطة) ← خط +12V", "P6KE18A: الشريطة ← +12V · التاني ← GND", "C1 100µF: (+) ← +12V · (−) ← GND", "C2 100nF: بين +12V وGND (جنب الـ 7805)", "7805: pin 1 ← +12V · pin 2 ← GND · pin 3 ← +5V", "C3 100nF: بين +5V وGND (جنب الـ 7805)"]
  },
  {
    g: "🔲 الـ IC CD40106",
    i: ["pin 14 ← +5V", "pin 7 ← GND", "C7 100nF بين pin 14 و pin 7", "pins 9 و 11 و 13 ← GND", "pins 8 و 10 و 12 ← فاضيين (مش متوصلين)"]
  },
  {
    g: "〰️ المذبذبات",
    i: ["R1 1M: بين pin 1 و pin 2", "C4 1µF: (+) ← pin 1 · (−) ← GND", "R2 390k: بين pin 3 و pin 4", "C5 1µF: (+) ← pin 3 · (−) ← GND", "R3 100k: بين pin 5 و pin 6", "C6 1µF: (+) ← pin 5 · (−) ← GND"]
  },
  {
    g: "🌀 الخلط والتنعيم (N)",
    i: ["R4 10k: pin 2 ← N", "R5 22k: pin 4 ← N", "R6 47k: pin 6 ← N", "R7 10k: +5V ← N", "C8 22µF: (+) ← N · (−) ← GND"]
  },
  {
    g: "💡 التشغيل واللمبة",
    i: ["N ← TIP122 pin 1 (B)", "TIP122 pin 3 (E) ← R8 68Ω ← GND", "TIP122 pin 3 (E) ← R9 68Ω ← GND (توازي مع R8)", "TIP122 pin 2 (C) ← LAMP− (أزرق)", "+12V ← LAMP+ (أصفر)", "GND ← السلك الأسود (أرضي العربية)"]
  }
]

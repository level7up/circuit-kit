import type { BomRow } from '../../types/circuit'

const MK = 'https://makerselectronics.com/product/'

export const bom: BomRow[] = [
  { g: '🧠 أول مرحلة (اشتري دول بس)' },
  { n: 'ESP32-S3 DevKit', s: 'ESP32-S3-N16R8 Development Board (WROOM-1) · مش نسخة الـ UNO', q: 1, p: 550, u: MK + 'esp32-s3-n16r8-development-board/', on: 1 },
  { n: 'زرار', s: 'Mini Push Button 2 Pin 6×6×15 مم · زرار الكلام', q: 1, p: 1, u: MK + 'mini-push-button-2-pin-6x6x15mm/', on: 1 },
  { n: 'بريد بورد', s: 'Breadboard 830 نقطة', q: 1, p: 35, u: MK + 'breadboard-830-point-splitted-power/', on: 1 },
  { n: 'سلوك', s: 'Jumper Wire 20 سم ذكر-ذكر', q: 10, p: 0.75, u: MK + 'jumper-wire-20-cm-male-to-male-pin/', on: 1 },
  { n: 'كابل USB', s: 'MAZE D20T USB-A ← Type-C (شحن وبيانات) · لو الماك USB-C بس: DADU DC-131', q: 1, p: 70, u: MK + 'maze-d20t-usb-a-cable-to-type-c-usb/', on: 1 },
  { g: '✨ بعد ما البرنامج يشتغل' },
  { n: 'زرار', s: 'Mini Push Button 2 Pin 6×6×15 مم · Cancel', q: 1, p: 1, u: MK + 'mini-push-button-2-pin-6x6x15mm/', on: 0 },
  { n: 'LED', s: 'Round LED 5 مم (أصفر) · الحالة', q: 1, p: 0.5, u: MK + 'round-led-5mm-2pin/', on: 0 },
  { n: 'مقاومة', s: '330Ω ¼W · للـ LED', q: 1, p: 0.15, u: MK + 'carbon-resistor-330%cf%89-0-25w/', on: 0 },
  { n: 'شاشة', s: 'OLED 0.96 بوصة I2C 4 رجول (SSD1306) · أبيض', q: 1, p: 140, u: MK + 'oled-display-i2c-4-pin-0-96%e2%80%b3-3/', on: 0 },
  { n: 'علبة', s: 'Black Plastic Project Box 75×55×30 مم', q: 1, p: 20, u: MK + 'black-plastic-project-box-75x55x30mm/', on: 0 },
  { n: 'جلاند', s: 'PG-7 Nylon Cable Gland · للكابل', q: 1, p: 4, u: MK + 'pg-7-nylon-waterproof-cable-gland/', on: 0 },
  { g: '🎧 عندك أصلاً (مش محسوب)' },
  { n: 'مايك وسماعة', s: 'مايك الماك نفسه أو هيدسيت', q: 1, p: 0, car: 1, on: 0 },
  { n: 'Mac', s: 'macOS + Python 3.11 + Claude Code متسجّل دخول', q: 1, p: 0, car: 1, on: 0 }
]

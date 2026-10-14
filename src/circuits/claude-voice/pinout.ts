import { COLORS } from '../../lib/scene/draw'

export interface HeaderPin {
  n: number
  name: string
  role: string
  color: string
}

const UNUSED = '#4a5470'

export const J1: HeaderPin[] = [
  { n: 1, name: '3V3', role: 'OLED VCC', color: '#ff9f43' },
  { n: 2, name: '3V3', role: '', color: UNUSED },
  { n: 3, name: 'RST', role: '', color: UNUSED },
  { n: 4, name: 'GPIO4', role: '← زرار الكلام', color: '#4ade80' },
  { n: 5, name: 'GPIO5', role: '← زرار Cancel', color: '#f87171' },
  { n: 6, name: 'GPIO6', role: '→ 330Ω → LED', color: '#ffb547' },
  { n: 7, name: 'GPIO7', role: '', color: UNUSED },
  { n: 8, name: 'GPIO15', role: '', color: UNUSED },
  { n: 9, name: 'GPIO16', role: '', color: UNUSED },
  { n: 10, name: 'GPIO17', role: '', color: UNUSED },
  { n: 11, name: 'GPIO18', role: '', color: UNUSED },
  { n: 12, name: 'GPIO8', role: '↔ OLED SDA', color: '#34d399' },
  { n: 13, name: 'GPIO3', role: 'متلمسوش (Strapping)', color: '#64748b' },
  { n: 14, name: 'GPIO46', role: 'متلمسوش (Strapping)', color: '#64748b' },
  { n: 15, name: 'GPIO9', role: '→ OLED SCL', color: '#10b981' },
  { n: 16, name: 'GPIO10', role: '', color: UNUSED },
  { n: 17, name: 'GPIO11', role: '', color: UNUSED },
  { n: 18, name: 'GPIO12', role: '', color: UNUSED },
  { n: 19, name: 'GPIO13', role: '', color: UNUSED },
  { n: 20, name: 'GPIO14', role: '', color: UNUSED },
  { n: 21, name: '5V', role: 'ممنوع على رجول الإشارة', color: '#64748b' },
  { n: 22, name: 'GND', role: 'الزرارين + LED + OLED', color: '#9aa6bd' }
]

export const PIN_GPIO = { ptt: 4, cancel: 5, led: 6, sda: 8, scl: 9 }

const ROW_H = 13.5
const TOP = 46

function row(p: HeaderPin, i: number): string {
  const y = TOP + i * ROW_H
  return `<rect x="172" y="${y - 5}" width="12" height="10" fill="#c9d3ea"/>` +
    `<text x="166" y="${y + 4}" font-size="10.5" text-anchor="end" fill="#ffb547" font-weight="700">${p.n}</text>` +
    `<text x="192" y="${y + 4}" font-size="11" fill="${p.color}" font-weight="700" direction="ltr">${p.name}</text>` +
    `<text x="250" y="${y + 4}" font-size="11" fill="${p.color}">${p.role}</text>`
}

export function headerSvg(): string {
  return `<svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="200" y="18" text-anchor="middle" fill="${COLORS.amber}" font-size="14" font-weight="700">ESP32-S3-DevKitC-1 · الهيدر J1</text>` +
    `<rect x="60" y="30" width="100" height="300" rx="8" fill="#0f766e" stroke="#e2e8f6" stroke-width="2"/>` +
    `<text x="110" y="180" text-anchor="middle" fill="#e2e8f6" font-size="12" transform="rotate(-90 110 180)">ESP32-S3</text>` +
    `<rect x="78" y="318" width="26" height="16" rx="3" fill="#9aa6bd"/><rect x="116" y="318" width="26" height="16" rx="3" fill="#9aa6bd"/>` +
    `<text x="110" y="350" text-anchor="middle" fill="#8f9bb6" font-size="10">منفذين: USB وUART</text>` +
    J1.map(row).join('') +
    `</svg>`
}

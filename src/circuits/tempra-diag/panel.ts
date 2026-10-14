import { COLORS, label } from '../../lib/scene/draw'

export interface PanelView {
  screen: string[]
  connected: boolean
  keyOn: boolean
  kLow: boolean
  talker: number
  caption: string
}

const OLED_TEXT = '#7dd3fc'
const LED_GLOW = '#3ddc97'
const MAX_SCREEN_CHARS = 21
const SCREEN_LINE_PX = 12.5

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function mono(x: number, y: number, text: string, color: string, size = 12): string {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="monospace" direction="ltr" text-anchor="start">${esc(text)}</text>`
}

function oled(x: number, y: number, lines: string[]): string {
  return `<rect x="${x}" y="${y}" width="190" height="112" rx="5" fill="#05070b" stroke="#2a3242" stroke-width="2"/>` +
    lines.map((l, i) => mono(x + 10, y + 16 + i * SCREEN_LINE_PX, clip(l, MAX_SCREEN_CHARS), OLED_TEXT, 11)).join('')
}

function button(x: number, y: number, name: string): string {
  return `<circle cx="${x}" cy="${y}" r="13" fill="#2b3446" stroke="#111" stroke-width="2"/>` + label(x, y + 30, name, { size: 11, color: COLORS.muted })
}

function led(x: number, y: number, lit: boolean): string {
  const glow = lit ? `<circle cx="${x}" cy="${y}" r="15" fill="${LED_GLOW}" opacity=".35"/>` : ''
  return glow + `<circle cx="${x}" cy="${y}" r="7" fill="${lit ? LED_GLOW : '#2a3242'}" stroke="#566179" stroke-width="1.5"/>`
}

function handheld(v: PanelView): string {
  return `<rect x="16" y="16" width="230" height="250" rx="14" fill="#1a1f2b" stroke="#2a3242" stroke-width="2"/>` +
    oled(36, 36, v.screen) +
    led(224, 40, v.connected) +
    button(70, 196, 'صفحة') + button(131, 196, 'حساسات') + button(192, 196, 'أعطال') +
    label(131, 252, 'ESP32 · LM393 · 2N2222A', { size: 10.5, color: COLORS.muted })
}

function lead(v: PanelView): string {
  const color = v.kLow ? COLORS.amber : '#9aa6bd'
  const who = v.talker === 2 ? '← الجهاز' : v.talker === 1 ? 'الكمبيوتر →' : ''
  return `<path d="M246 140 H 330" stroke="${color}" stroke-width="5" fill="none"/>` +
    label(288, 128, 'خط K', { size: 11, color: COLORS.muted }) +
    label(288, 162, who, { size: 11, color: COLORS.amber })
}

function ecu(v: PanelView): string {
  const fill = v.keyOn ? '#1f2937' : '#11151d'
  return `<rect x="330" y="70" width="250" height="140" rx="10" fill="${fill}" stroke="#2a3242" stroke-width="2"/>` +
    label(455, 112, 'كمبيوتر المحرك (محاكَى)', { size: 13, color: COLORS.muted }) +
    mono(380, 142, 'BOSCH 0 261 200 721', v.keyOn ? '#e2e8f6' : '#4a5470', 13) +
    label(455, 182, v.keyOn ? 'المفتاح ON' : 'المفتاح مقفول: مطفي', { size: 12, color: v.keyOn ? COLORS.ok : COLORS.bad })
}

export function panelSvg(v: PanelView): string {
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/>` +
    handheld(v) + lead(v) + ecu(v) +
    label(300, 290, v.caption, { size: 13, color: COLORS.amber }) +
    `</svg>`
}

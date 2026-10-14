import { COLORS, label } from '../../lib/scene/draw'
import type { SerialLine } from './simulate'

export interface PanelView {
  powered: boolean
  pttDown: boolean
  cancelDown: boolean
  led: boolean
  oled: string
  hostState: string
  serial: SerialLine[]
  heard: string
  spoken: string
  caption: string
}

const LED_GLOW = '#ffb547'
const MAX_LOG_CHARS = 26
const MAX_TEXT_CHARS = 34

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function mono(x: number, y: number, text: string, color: string, size = 12): string {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="monospace" direction="ltr" text-anchor="start">${esc(text)}</text>`
}

function button(x: number, y: number, r: number, down: boolean, color: string, name: string): string {
  return `<circle cx="${x}" cy="${y + 3}" r="${r}" fill="#0b0f17"/>` +
    `<circle cx="${x}" cy="${y + (down ? 3 : 0)}" r="${r}" fill="${down ? '#3a3f4b' : color}" stroke="#111" stroke-width="2"/>` +
    label(x, y + r + 20, name, { size: 12, color: COLORS.muted })
}

function led(x: number, y: number, lit: boolean): string {
  const glow = lit ? `<circle cx="${x}" cy="${y}" r="17" fill="${LED_GLOW}" opacity=".35"/>` : ''
  return glow + `<circle cx="${x}" cy="${y}" r="8" fill="${lit ? LED_GLOW : '#2a3242'}" stroke="#566179" stroke-width="1.5"/>` +
    label(x, y + 26, 'LED', { size: 11, color: COLORS.muted })
}

function oled(x: number, y: number, text: string, powered: boolean): string {
  return `<rect x="${x}" y="${y}" width="120" height="44" rx="4" fill="#05070b" stroke="#2a3242" stroke-width="2"/>` +
    (powered ? mono(x + 10, y + 28, text, '#7dd3fc', 15) : '') +
    label(x + 60, y + 60, 'OLED (اختياري)', { size: 10.5, color: COLORS.muted })
}

function device(v: PanelView): string {
  return `<rect x="16" y="16" width="220" height="250" rx="14" fill="#1a1f2b" stroke="#2a3242" stroke-width="2"/>` +
    `<rect x="40" y="34" width="70" height="40" rx="4" fill="#0f766e" stroke="#134e4a"/>` + label(75, 59, 'ESP32-S3', { size: 11 }) +
    oled(100, 92, v.oled, v.powered) +
    led(190, 54, v.powered && v.led) +
    button(70, 180, 34, v.pttDown, '#16a34a', 'اتكلم (PTT)') +
    button(180, 192, 18, v.cancelDown, '#dc2626', 'Cancel')
}

function cable(powered: boolean): string {
  const dash = powered ? '' : ' stroke-dasharray="6 6"'
  return `<path d="M236 140 C 262 140, 262 140, 290 140" stroke="${powered ? '#9aa6bd' : '#3a3f4b'}" stroke-width="5" fill="none"${dash}/>` +
    label(263, 128, 'USB', { size: 11, color: COLORS.muted })
}

function logLines(lines: SerialLine[]): string {
  return lines.map((l, i) => {
    const color = !l.ok ? COLORS.bad : l.up ? '#93c5fd' : '#c4b5fd'
    return mono(306, 112 + i * 15, (l.up ? '↑ ' : '↓ ') + clip(l.text, MAX_LOG_CHARS) + (l.ok ? '' : '  ✗'), color, 11.5)
  }).join('')
}

function mac(v: PanelView): string {
  return `<rect x="290" y="16" width="294" height="250" rx="10" fill="#0d1117" stroke="#2a3242" stroke-width="2"/>` +
    `<circle cx="306" cy="30" r="4" fill="#ef4444"/><circle cx="320" cy="30" r="4" fill="#f59e0b"/><circle cx="334" cy="30" r="4" fill="#22c55e"/>` +
    mono(350, 34, 'claude-voice-terminal', COLORS.muted, 11) +
    mono(306, 66, v.hostState, COLORS.amber, 17) +
    mono(306, 92, 'serial:', COLORS.muted, 11) +
    logLines(v.serial) +
    mono(306, 228, '🎤 ' + clip(v.heard || '—', MAX_TEXT_CHARS), '#e2e8f6', 11.5) +
    mono(306, 248, '🔊 ' + clip(v.spoken || '—', MAX_TEXT_CHARS), '#e2e8f6', 11.5)
}

export function panelSvg(v: PanelView): string {
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/>` +
    device(v) + cable(v.powered) + mac(v) +
    label(300, 290, v.caption, { size: 13, color: COLORS.amber }) +
    `</svg>`
}

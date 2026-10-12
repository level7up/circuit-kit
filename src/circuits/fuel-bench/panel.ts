import { COLORS, label } from '../../lib/scene/draw'

export interface PanelView {
  lcd: [string, string]
  powered: boolean
  run: boolean
  fault: boolean
  lamp: number
  arm: boolean
  knobPct: number
  sensorPct: number
  caption: string
}

const LAMP_GLOW = '#ffd27a'
const KNOB_SWEEP_DEG = 270
const KNOB_START_DEG = -135

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ /g, ' ')

function lcd(x: number, y: number, lines: [string, string], powered: boolean): string {
  const text = (line: string, dy: number) =>
    `<text x="${x + 14}" y="${y + dy}" fill="${powered ? '#0b2a12' : 'transparent'}" font-size="17" font-family="monospace" font-weight="700" direction="ltr">${esc(line)}</text>`
  return `<rect x="${x}" y="${y}" width="210" height="70" rx="6" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2"/>` +
    `<rect x="${x + 8}" y="${y + 8}" width="194" height="54" rx="3" fill="${powered ? '#8fd16a' : '#3b5a2e'}"/>` +
    text(lines[0], 31) + text(lines[1], 53)
}

function led(x: number, y: number, color: string, lit: boolean, name: string): string {
  const glow = lit ? `<circle cx="${x}" cy="${y}" r="16" fill="${color}" opacity=".35"/>` : ''
  return glow + `<circle cx="${x}" cy="${y}" r="9" fill="${lit ? color : '#2a3242'}" stroke="#566179" stroke-width="1.5"/>` +
    label(x, y + 28, name, { size: 11, color: COLORS.muted })
}

function knob(x: number, y: number, pct: number, name: string, sub: string): string {
  const a = ((KNOB_START_DEG + (KNOB_SWEEP_DEG * pct) / 100) * Math.PI) / 180
  const tip = [x + 18 * Math.sin(a), y - 18 * Math.cos(a)]
  return `<circle cx="${x}" cy="${y}" r="24" fill="#20252f" stroke="#566179" stroke-width="2"/>` +
    `<line x1="${x}" y1="${y}" x2="${tip[0]}" y2="${tip[1]}" stroke="${COLORS.amber}" stroke-width="4" stroke-linecap="round"/>` +
    label(x, y + 42, name, { size: 12 }) + label(x, y + 58, sub, { size: 11, color: COLORS.muted })
}

function rocker(x: number, y: number, on: boolean): string {
  return `<rect x="${x}" y="${y}" width="40" height="60" rx="6" fill="#111" stroke="#566179" stroke-width="2"/>` +
    `<rect x="${x + 6}" y="${on ? y + 6 : y + 30}" width="28" height="24" rx="3" fill="${on ? '#ef4444' : '#3a3f4b'}"/>` +
    label(x + 20, y + 78, 'S1 ' + (on ? 'ON' : 'OFF'), { size: 12, color: on ? COLORS.ok : COLORS.muted })
}

function lamp(x: number, y: number, level: number): string {
  const glow = level > 0 ? `<circle cx="${x}" cy="${y}" r="${30 + 30 * level}" fill="${LAMP_GLOW}" opacity="${0.15 + 0.35 * level}"/>` : ''
  return glow + `<circle cx="${x}" cy="${y}" r="22" fill="${level > 0 ? LAMP_GLOW : '#2a3242'}" stroke="#8a96a8" stroke-width="2" opacity="${level > 0 ? 0.4 + 0.6 * level : 1}"/>` +
    `<rect x="${x - 10}" y="${y + 22}" width="20" height="16" fill="#9aa6bd"/>` +
    label(x, y + 58, 'اللمبة = الطرمبة', { size: 12, color: COLORS.muted })
}

export function panelSvg(v: PanelView): string {
  return `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="600" height="300" fill="#0b0f17"/>` +
    `<rect x="16" y="16" width="420" height="250" rx="14" fill="#1a1f2b" stroke="#2a3242" stroke-width="2"/>` +
    lcd(34, 34, v.lcd, v.powered) +
    led(290, 58, '#3ddc84', v.run, 'RUN') + led(340, 58, '#ff5d5d', v.fault, 'FAULT') +
    rocker(380, 34, v.arm) +
    knob(80, 170, v.knobPct, 'المقبض', v.knobPct + '%') +
    knob(190, 170, v.sensorPct, 'محاكي الحساس', 'الضغط ' + Math.round(v.sensorPct) + '%') +
    `<circle cx="300" cy="170" r="20" fill="#16a34a" stroke="#0f5132" stroke-width="3"/>` + label(300, 212, 'تشغيل / Reset', { size: 12 }) +
    label(300, 228, 'ضغطة طويلة = Reset', { size: 11, color: COLORS.muted }) +
    lamp(520, 120, v.lamp) +
    label(300, 290, v.caption, { size: 13, color: COLORS.amber }) +
    `</svg>`
}

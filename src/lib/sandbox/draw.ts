import type { BoardPart } from '../../types/circuit'
import { holeXY } from '../breadboard/geometry'
import { drawPart } from '../breadboard/draw'
import type { LedColor, PartResult, SandboxPart } from './solver'
import { wireColorFor } from './placement'

export const LED_FILL: Record<LedColor, string> = { red: '#ff4a3d', yellow: '#ffc83d', green: '#39e26b', blue: '#4d8dff', white: '#f4f7ff' }

const baseCtx = { wireColor: () => '#2563eb', text: () => undefined, color: () => '#fff', variant: () => undefined, dead: () => false }

function asBoardPart(p: SandboxPart, k: BoardPart['k']): BoardPart {
  return { id: p.id, k, s: 0, ohm: p.ohms, pins: [[p.a, 'A'], [p.b, 'B']] }
}

function led(p: SandboxPart, r: PartResult | undefined): string {
  const a = holeXY(p.a)
  const b = holeXY(p.b)
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const burned = p.burned || r?.ledState === 'burned'
  const fill = burned ? '#3b2a22' : LED_FILL[p.color ?? 'red']
  const glow = burned ? 0 : r?.brightness ?? 0
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const fx = cx + Math.cos(ang) * 8.5
  const fy = cy + Math.sin(ang) * 8.5
  const px = -Math.sin(ang) * 9
  const py = Math.cos(ang) * 9
  return `<circle cx="${cx}" cy="${cy}" r="${16 + 14 * glow}" fill="${fill}" opacity="${(glow * 0.55).toFixed(2)}" filter="blur(3px)"/>`
    + `<line x1="${a.x}" y1="${a.y}" x2="${cx}" y2="${cy}" class="bb-lead"/><line x1="${b.x}" y1="${b.y}" x2="${cx}" y2="${cy}" class="bb-lead"/>`
    + `<circle cx="${cx}" cy="${cy}" r="9.5" fill="${fill}" stroke="rgba(0,0,0,.4)" stroke-width="1" opacity="${burned ? 1 : 0.55 + 0.45 * glow}"/>`
    + `<line x1="${(fx + px).toFixed(1)}" y1="${(fy + py).toFixed(1)}" x2="${(fx - px).toFixed(1)}" y2="${(fy - py).toFixed(1)}" stroke="rgba(0,0,0,.45)" stroke-width="2"/>`
    + `<circle cx="${cx - 3}" cy="${cy - 3}" r="2.6" fill="#fff" opacity="${burned ? 0 : 0.5 + 0.5 * glow}"/>`
    + `<text x="${a.x}" y="${a.y - 7}" class="sb-plus">+</text>`
    + (burned ? `<text x="${cx}" y="${cy - 13}" class="sb-burn">🔥</text>` : '')
}

function toggleSwitch(p: SandboxPart): string {
  const a = holeXY(p.a)
  const b = holeXY(p.b)
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const horizontal = a.y === b.y
  const w = horizontal ? Math.abs(b.x - a.x) + 10 : 20
  const h = horizontal ? 20 : Math.abs(b.y - a.y) + 10
  const knob = horizontal ? { x: cx + (p.closed ? 5 : -12), y: cy - 5, w: 7, h: 10 } : { x: cx - 5, y: cy + (p.closed ? 5 : -12), w: 10, h: 7 }
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bb-lead"/>`
    + `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4" class="sb-switch"/>`
    + `<rect x="${knob.x}" y="${knob.y}" width="${knob.w}" height="${knob.h}" rx="2" class="${p.closed ? 'sb-knob-on' : 'sb-knob'}"/>`
    + `<text x="${cx}" y="${cy + h / 2 + 11}" class="sb-caption">${p.closed ? 'ON' : 'OFF'}</text>`
}

const mid = (p: SandboxPart) => {
  const a = holeXY(p.a)
  const b = holeXY(p.b)
  return { a, b, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
}
const leads = (p: SandboxPart, cx: number, cy: number) => [p.a, p.b, ...(p.c ? [p.c] : [])]
  .map(h => { const q = holeXY(h); return `<line x1="${q.x}" y1="${q.y}" x2="${cx}" y2="${cy}" class="bb-lead"/><circle cx="${q.x}" cy="${q.y}" r="2.6" class="bb-foot"/>` }).join('')

function button(p: SandboxPart): string {
  const { cx, cy } = mid(p)
  return leads(p, cx, cy) + `<rect x="${cx - 13}" y="${cy - 13}" width="26" height="26" rx="4" class="sb-btn-body"/><circle cx="${cx}" cy="${cy}" r="8" class="${p.pressed ? 'sb-btn-cap on' : 'sb-btn-cap'}"/><text x="${cx}" y="${cy + 24}" class="sb-caption">${p.pressed ? 'مضغوط' : 'اضغط'}</text>`
}

function buzzer(p: SandboxPart, r?: PartResult): string {
  const { a, cx, cy } = mid(p)
  const waves = r?.active ? [16, 22, 28].map((rad, i) => `<path d="M${cx + rad * 0.7},${cy - rad * 0.7} A${rad},${rad} 0 0 1 ${cx + rad * 0.7},${cy + rad * 0.7}" class="sb-wave" style="animation-delay:${i * 0.15}s"/>`).join('') : ''
  return leads(p, cx, cy) + `<circle cx="${cx}" cy="${cy}" r="12" class="sb-buzzer"/><circle cx="${cx}" cy="${cy}" r="3" fill="#0b0f17"/>` + waves + `<text x="${a.x}" y="${a.y - 7}" class="sb-plus">+</text>`
}

function bulb(p: SandboxPart, r?: PartResult): string {
  const { cx, cy } = mid(p)
  const glow = r?.brightness ?? 0
  return `<circle cx="${cx}" cy="${cy}" r="${14 + 18 * glow}" fill="#ffb45a" opacity="${(glow * 0.6).toFixed(2)}" filter="blur(4px)"/>` + leads(p, cx, cy)
    + `<circle cx="${cx}" cy="${cy}" r="12" fill="rgba(255,248,230,${(0.35 + 0.6 * glow).toFixed(2)})" stroke="#cbd5e1"/><path d="M${cx - 6},${cy + 3} l3,-6 l3,6 l3,-6 l3,6" fill="none" stroke="${glow > 0.05 ? '#ff9a2e' : '#6b7280'}" stroke-width="1.4"/>`
}

function motor(p: SandboxPart, r?: PartResult): string {
  const { cx, cy } = mid(p)
  const speed = r?.speed ?? 0
  const spin = speed > 0 ? `style="animation-duration:${(1.4 - speed * 1.2).toFixed(2)}s"` : ''
  return leads(p, cx, cy) + `<circle cx="${cx}" cy="${cy}" r="16" class="sb-motor"/><g class="${speed > 0 ? 'sb-rotor spin' : 'sb-rotor'}" ${spin}><rect x="${cx - 12}" y="${cy - 2}" width="24" height="4" rx="2" class="sb-blade"/><rect x="${cx - 2}" y="${cy - 12}" width="4" height="24" rx="2" class="sb-blade"/></g><circle cx="${cx}" cy="${cy}" r="3" fill="#e5e7eb"/>`
}

function ldr(p: SandboxPart): string {
  const { cx, cy } = mid(p)
  const track = [-6, -2, 2, 6].map(y => `<line x1="${cx - 7}" y1="${cy + y}" x2="${cx + 7}" y2="${cy + y}" stroke="#b45309" stroke-width="1.6"/>`).join('')
  return leads(p, cx, cy) + `<circle cx="${cx}" cy="${cy}" r="11" class="sb-ldr"/>${track}`
}

function pot(p: SandboxPart): string {
  const { cx, cy } = mid(p)
  const ang = (-135 + 270 * (p.level ?? 0.5)) * Math.PI / 180
  return leads(p, cx, cy) + `<rect x="${cx - 16}" y="${cy - 16}" width="32" height="32" rx="4" class="sb-pot"/><circle cx="${cx}" cy="${cy}" r="11" class="sb-pot-knob"/><line x1="${cx}" y1="${cy}" x2="${(cx + 9 * Math.sin(ang)).toFixed(1)}" y2="${(cy - 9 * Math.cos(ang)).toFixed(1)}" stroke="#0b0f17" stroke-width="2.4" stroke-linecap="round"/>`
}

function npn(p: SandboxPart, r?: PartResult): string {
  const { cx, cy } = mid(p)
  const burned = p.burned || r?.transistor === 'burned'
  const legs = [p.a, p.c ?? p.a, p.b].map(h => holeXY(h))
  const names = ['C', 'B', 'E']
  return leads(p, cx, cy) + `<path d="M${cx - 13},${cy + 6} L${cx - 13},${cy - 2} A13,13 0 0 1 ${cx + 13},${cy - 2} L${cx + 13},${cy + 6} Z" class="sb-to92"/>`
    + `<text x="${cx}" y="${cy + 3}" class="sb-to92t">BC547</text>`
    + legs.map((q, i) => `<text x="${q.x}" y="${q.y + 13}" class="sb-pin">${names[i]}</text>`).join('')
    + (burned ? `<text x="${cx}" y="${cy - 16}" class="sb-burn">🔥</text>` : '')
}

function diode(p: SandboxPart): string {
  return drawPart(asBoardPart(p, 'diode'), { ...baseCtx, ohm: () => undefined })
}

export function drawSandboxPart(p: SandboxPart, r?: PartResult): string {
  switch (p.kind) {
    case 'res': return drawPart(asBoardPart(p, 'res'), { ...baseCtx, ohm: () => p.ohms })
    case 'wire': return drawPart(asBoardPart(p, 'jumper'), { ...baseCtx, wireColor: () => wireColorFor(p.a, p.b), ohm: () => undefined })
    case 'led': return led(p, r)
    case 'switch': return toggleSwitch(p)
    case 'button': return button(p)
    case 'diode': return diode(p)
    case 'buzzer': return buzzer(p, r)
    case 'bulb': return bulb(p, r)
    case 'motor': return motor(p, r)
    case 'ldr': return ldr(p)
    case 'pot': return pot(p)
    case 'npn': return npn(p, r)
  }
}

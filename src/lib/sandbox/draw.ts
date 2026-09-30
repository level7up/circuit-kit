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

export function drawSandboxPart(p: SandboxPart, r?: PartResult): string {
  switch (p.kind) {
    case 'res': return drawPart(asBoardPart(p, 'res'), { ...baseCtx, ohm: () => p.ohms })
    case 'wire': return drawPart(asBoardPart(p, 'jumper'), { ...baseCtx, wireColor: () => wireColorFor(p.a, p.b), ohm: () => undefined })
    case 'led': return led(p, r)
    case 'switch': return toggleSwitch(p)
  }
}

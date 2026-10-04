import type { Hole, PerfLayout, PerfPart } from '../../types/circuit'
import { resistorBands } from '../format'
import { expandPath, holeKey } from './grid'
import type { StripPlan } from './stripboard'

export const PITCH = 22
const MARGIN = 34
const SOLDER = '#d5dbe3'
const COPPER = '#c27a3a'
const LEG = '#b8c0ca'

export type Side = 'top' | 'bottom'
export type BoardType = 'perf' | 'strip'

export interface PerfView {
  side: Side
  type: BoardType
  stage: number
  selected: string | null
  net: string | null
  icInserted: boolean
  strip: StripPlan
}

interface Pt {
  x: number
  y: number
}

type Project = (h: Hole) => Pt

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function boardSize(layout: PerfLayout): { w: number; h: number } {
  return { w: MARGIN * 2 + (layout.cols - 1) * PITCH, h: MARGIN * 2 + (layout.rows - 1) * PITCH }
}

function projector(layout: PerfLayout, side: Side): Project {
  return ([x, y]) => ({
    x: MARGIN + (side === 'bottom' ? layout.cols - 1 - x : x) * PITCH,
    y: MARGIN + y * PITCH
  })
}

const ROW_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const holeName = ([x, y]: Hole): string => (ROW_NAMES[y] ?? '?') + (x + 1)

function rulers(layout: PerfLayout, at: Project): string {
  const cols = Array.from({ length: layout.cols }, (_, x) => {
    const p = at([x, 0])
    return `<text x="${p.x}" y="${MARGIN - 21}" class="pf-ruler">${x + 1}</text>`
  })
  const rows = Array.from({ length: layout.rows }, (_, y) => {
    const p = at([0, y])
    const { w } = boardSize(layout)
    return `<text x="12" y="${p.y + 4}" class="pf-ruler">${ROW_NAMES[y]}</text><text x="${w - 12}" y="${p.y + 4}" class="pf-ruler">${ROW_NAMES[y]}</text>`
  })
  return cols.join('') + rows.join('')
}

function boardBase(layout: PerfLayout, side: Side): string {
  const { w, h } = boardSize(layout)
  const fill = side === 'top' ? '#d9bd84' : '#a7854f'
  return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="${fill}" stroke="#6b5531" stroke-width="2"/>`
}

function stripsSvg(layout: PerfLayout, plan: StripPlan, at: Project): string {
  const count = plan.axis === 'cols' ? layout.cols : layout.rows
  const length = plan.axis === 'cols' ? layout.rows : layout.cols
  const half = PITCH * 0.4
  return Array.from({ length: count }, (_, s) => {
    const a = at(plan.axis === 'cols' ? [s, 0] : [0, s])
    const b = at(plan.axis === 'cols' ? [s, length - 1] : [length - 1, s])
    return `<rect x="${Math.min(a.x, b.x) - half}" y="${Math.min(a.y, b.y) - half}" width="${Math.abs(b.x - a.x) + half * 2}" height="${Math.abs(b.y - a.y) + half * 2}" rx="3" fill="${COPPER}" opacity=".9"/>`
  }).join('')
}

function holesSvg(layout: PerfLayout, withPads: boolean, at: Project): string {
  const out: string[] = []
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const p = at([x, y])
      if (withPads) out.push(`<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.36}" fill="${COPPER}"/>`)
      out.push(`<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.15}" fill="#2b2216"/>`)
    }
  }
  return out.join('')
}

function cutsSvg(plan: StripPlan, side: Side, at: Project): string {
  return plan.cuts.map(c => {
    const whole = Math.floor(c.at)
    const base = at(plan.axis === 'cols' ? [c.strip, whole] : [whole, c.strip])
    const shift = (c.at - whole) * PITCH
    const p = plan.axis === 'cols' ? { x: base.x, y: base.y + shift } : { x: base.x + (side === 'bottom' ? -shift : shift), y: base.y }
    if (c.drill) return `<circle class="pf-cut" cx="${p.x}" cy="${p.y}" r="${PITCH * 0.42}" fill="#3a2a18" stroke="#ff5d5d" stroke-width="2.5"/>`
    const len = PITCH * 0.5
    const line = plan.axis === 'cols'
      ? `x1="${p.x - len}" y1="${p.y}" x2="${p.x + len}" y2="${p.y}"`
      : `x1="${p.x}" y1="${p.y - len}" x2="${p.x}" y2="${p.y + len}"`
    return `<g class="pf-cut"><line ${line} stroke="#2b2216" stroke-width="5"/><line ${line} stroke="#ff5d5d" stroke-width="2"/></g>`
  }).join('')
}

function tracesSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  return layout.traces.filter(t => t.s <= view.stage).map(t => {
    const pts = expandPath(t.pts).map(at).map(p => `${p.x},${p.y}`).join(' ')
    const on = view.net === t.net
    const cls = ['pf-trace', on ? 'on' : '', t.s === view.stage ? 'fresh' : ''].filter(Boolean).join(' ')
    return `<g class="${cls}" data-net="${t.net}">` +
      `<polyline points="${pts}" fill="none" stroke="${SOLDER}" stroke-width="${PITCH * 0.42}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<polyline points="${pts}" fill="none" stroke="${layout.nets[t.net]?.c ?? '#888'}" stroke-width="${on ? 4 : 2}" stroke-linecap="round" stroke-linejoin="round" opacity="${on ? 1 : 0.75}"/></g>`
  }).join('')
}

function linksSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  return view.strip.links.filter(l => l.s <= view.stage).map(l => {
    const a = at(l.a)
    const b = at(l.b)
    const on = view.net === l.net
    const line = `x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"`
    return `<g class="pf-link${on ? ' on' : ''}" data-net="${l.net}">` +
      `<line ${line} stroke="#111" stroke-width="7" stroke-linecap="round"/>` +
      `<line ${line} stroke="${layout.nets[l.net]?.c ?? '#888'}" stroke-width="${on ? 5 : 4}" stroke-linecap="round"/>` +
      `<circle cx="${a.x}" cy="${a.y}" r="3" fill="${SOLDER}"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="${SOLDER}"/></g>`
  }).join('')
}

function jointsSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  const holes = new Map<string, { h: Hole; net: string; id: string }>()
  layout.parts.filter(p => p.s <= view.stage && !p.optional)
    .forEach(p => p.legs.forEach((h, i) => holes.set(holeKey(h), { h, net: p.nets[i], id: p.id })))
  return [...holes.values()].map(({ h, net, id }) => {
    const p = at(h)
    const on = view.net === net || view.selected === id
    return `<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.3}" fill="${SOLDER}" stroke="${on ? '#ffb547' : '#8d96a3'}" stroke-width="${on ? 3 : 1}"/>`
  }).join('')
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const angle = (a: Pt, b: Pt) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
const legLine = (a: Pt, b: Pt) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${LEG}" stroke-width="2.4" stroke-linecap="round"/>`
const legDot = (p: Pt) => `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="${LEG}"/>`
const along = (a: Pt, b: Pt, inner: string) => {
  const c = mid(a, b)
  return legLine(a, b) + `<g transform="translate(${c.x} ${c.y}) rotate(${angle(a, b)})">${inner}</g>`
}

function resistor(a: Pt, b: Pt, ohm: number): string {
  const len = PITCH * 2.3
  const thick = PITCH * 0.5
  const step = len / 7
  const bands = (ohm ? resistorBands(ohm) : []).map((c, i) =>
    `<rect x="${-len / 2 + step * (i < 3 ? i + 1.2 : 5.6)}" y="${-thick / 2}" width="${step * 0.6}" height="${thick}" fill="${c}"/>`)
  return along(a, b, `<rect x="${-len / 2}" y="${-thick / 2}" width="${len}" height="${thick}" rx="${thick / 2}" fill="#e6cf9c" stroke="#8b6d3a"/>` + bands.join(''))
}

function diode(a: Pt, b: Pt, big: boolean): string {
  const len = PITCH * (big ? 1.9 : 1.6)
  const thick = PITCH * (big ? 0.7 : 0.55)
  return along(a, b,
    `<rect x="${-len / 2}" y="${-thick / 2}" width="${len}" height="${thick}" rx="3" fill="#1f1f1f" stroke="#555"/>` +
    `<rect x="${len / 2 - len * 0.22}" y="${-thick / 2}" width="${len * 0.12}" height="${thick}" fill="#d9dee5"/>`)
}

function standingResistor(a: Pt, b: Pt, ohm: number): string {
  const r = PITCH * 0.42
  const rings = (ohm ? resistorBands(ohm) : []).slice(0, 3).map((c, i) =>
    `<circle cx="${a.x}" cy="${a.y}" r="${r * (0.85 - i * 0.22)}" fill="none" stroke="${c}" stroke-width="2.4"/>`)
  return `<path d="M${a.x} ${a.y - r} Q ${mid(a, b).x} ${a.y - r * 2.3} ${b.x} ${b.y}" fill="none" stroke="${LEG}" stroke-width="2.2"/>` +
    `<circle cx="${a.x}" cy="${a.y}" r="${r}" fill="#e6cf9c" stroke="#8b6d3a"/>` + rings.join('') + legDot(b)
}

function electrolytic(a: Pt, b: Pt, span: number): string {
  const c = mid(a, b)
  const r = PITCH * (span > 1 ? 0.95 : 0.72)
  const minus = { x: c.x + (b.x - c.x) * 0.6, y: c.y + (b.y - c.y) * 0.6 }
  const plus = { x: c.x + (a.x - c.x) * 0.6, y: c.y + (a.y - c.y) * 0.6 }
  return `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="#24418a" stroke="#0f1d40" stroke-width="1.5"/>` +
    `<circle cx="${minus.x}" cy="${minus.y}" r="${r * 0.4}" fill="#c9d3e6" opacity=".9"/>` +
    `<text x="${minus.x}" y="${minus.y + 4}" class="pf-pol" fill="#24418a">−</text>` +
    `<text x="${plus.x}" y="${plus.y + 4}" class="pf-pol" fill="#fff">+</text>`
}

function ceramic(a: Pt, b: Pt): string {
  return along(a, b, `<ellipse rx="${PITCH * 0.55}" ry="${PITCH * 0.32}" fill="#e08a2b" stroke="#8a4b10"/>`)
}

function to220(legs: Pt[], face: string, val: string): string {
  const c = legs[1]
  const vertical = legs[0].x === legs[2].x
  const long = PITCH * 3.4
  const thick = PITCH * 0.75
  const toward = face === 'left' || face === 'up' ? -1 : 1
  const body = vertical
    ? { x: c.x - thick / 2 + toward * 3, y: c.y - long / 2, w: thick, h: long }
    : { x: c.x - long / 2, y: c.y - thick / 2 + toward * 3, w: long, h: thick }
  const tab = vertical
    ? { x: toward < 0 ? body.x + body.w : body.x - 5, y: body.y, w: 5, h: body.h }
    : { x: body.x, y: toward < 0 ? body.y + body.h : body.y - 5, w: body.w, h: 5 }
  const cx = body.x + body.w / 2
  const cy = body.y + body.h / 2
  return `<rect x="${tab.x}" y="${tab.y}" width="${tab.w}" height="${tab.h}" fill="#c4ccd6"/>` +
    `<rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="2" fill="#1b1b1b" stroke="#555"/>` +
    `<text x="${cx}" y="${cy + 3}" class="pf-chip"${vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : ''}>${esc(val)}</text>` +
    legs.map(legDot).join('')
}

function dip(legs: Pt[], inserted: boolean): string {
  const xs = legs.map(p => p.x)
  const ys = legs.map(p => p.y)
  const x0 = Math.min(...xs) - PITCH * 0.55
  const x1 = Math.max(...xs) + PITCH * 0.55
  const y0 = Math.min(...ys) - PITCH * 0.45
  const y1 = Math.max(...ys) + PITCH * 0.45
  const cy = (y0 + y1) / 2
  const inner = inserted
    ? `<rect x="${x0 + 4}" y="${y0 + 8}" width="${x1 - x0 - 8}" height="${y1 - y0 - 16}" rx="2" fill="#141414"/><text x="${(x0 + x1) / 2}" y="${cy + 4}" class="pf-chip">CD40106</text>`
    : `<text x="${(x0 + x1) / 2}" y="${cy + 4}" class="pf-chip dim">قاعدة فاضية</text>`
  return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="#2e2e2e" stroke="#777"/>` +
    `<path d="M${x0} ${cy - 7} a7 7 0 0 1 0 14" fill="#666"/>` + inner + legs.map(legDot).join('') +
    `<circle cx="${legs[0].x}" cy="${legs[0].y + PITCH * 0.6}" r="2.6" fill="#ffd24d"/>`
}

function pad(part: PerfPart, layout: PerfLayout, at: Project): string {
  const p = at(part.legs[0])
  const [x, y] = part.legs[0]
  const onSideEdge = x === 0 || x === layout.cols - 1
  const exitLeft = p.x < boardSize(layout).w / 2
  const end = !onSideEdge && y === 0 ? { x: p.x, y: 0 } : { x: exitLeft ? 0 : boardSize(layout).w, y: p.y }
  const color = part.color ?? '#888'
  const line = `x1="${p.x}" y1="${p.y}" x2="${end.x}" y2="${end.y}"`
  return `<line ${line} stroke="#000" stroke-width="8" stroke-linecap="round"/><line ${line} stroke="${color}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${color}" stroke="#000"/>`
}

function partBody(part: PerfPart, layout: PerfLayout, view: PerfView, at: Project): string {
  const legs = part.legs.map(at)
  const first = part.legs[0]
  const last = part.legs[part.legs.length - 1]
  const span = Math.abs(first[0] - last[0]) + Math.abs(first[1] - last[1])
  switch (part.k) {
    case 'res': return resistor(legs[0], legs[1], part.ohm ?? 0)
    case 'resUp': return standingResistor(legs[0], legs[1], part.ohm ?? 0)
    case 'diode': return diode(legs[0], legs[1], false)
    case 'tvs': return diode(legs[0], legs[1], true)
    case 'can': return electrolytic(legs[0], legs[1], span)
    case 'ceramic': return ceramic(legs[0], legs[1])
    case 'to220': return to220(legs, part.face ?? 'down', part.val)
    case 'dip': return dip(legs, view.icInserted)
    case 'pad': return pad(part, layout, at)
  }
}

function labelPos(part: PerfPart, at: Project): Pt {
  const pts = part.legs.map(at)
  const c = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length }
  const isVertical = pts.length > 1 && pts[0].x === pts[pts.length - 1].x
  if (part.labelAt) return { x: c.x + part.labelAt[0] * PITCH, y: c.y + part.labelAt[1] * PITCH }
  switch (part.k) {
    case 'dip': return { x: c.x, y: Math.min(...pts.map(p => p.y)) - PITCH * 0.9 }
    case 'pad': return { x: pts[0].x + (pts[0].x < 60 ? 16 : -16), y: pts[0].y - 9 }
    case 'resUp': return { x: pts[0].x - 2, y: pts[0].y + PITCH * 0.95 }
    case 'to220': return isVertical ? { x: c.x + PITCH * 1.05, y: c.y + 4 } : { x: c.x, y: c.y + PITCH * 1.2 }
    case 'can': return { x: c.x, y: c.y + 4 }
    default: return isVertical ? { x: c.x + PITCH * 0.75, y: c.y + 4 } : { x: c.x, y: c.y - PITCH * 0.55 }
  }
}

function partsSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  return layout.parts.filter(p => p.s <= view.stage).map(part => {
    const cls = ['pf-part', part.s === view.stage ? 'fresh' : '', view.selected === part.id ? 'sel' : '', part.optional ? 'opt' : ''].filter(Boolean).join(' ')
    const l = labelPos(part, at)
    const labelClass = part.k === 'can' && !part.labelAt ? 'pf-lab in' : 'pf-lab'
    return `<g class="${cls}" data-id="${part.id}">${partBody(part, layout, view, at)}<text x="${l.x}" y="${l.y}" class="${labelClass}">${esc(part.lab)}</text></g>`
  }).join('')
}

function bottomLabels(layout: PerfLayout, view: PerfView, at: Project): string {
  const legsOf = layout.parts.filter(p => p.s <= view.stage && p.k !== 'dip' && !p.optional).map(part => {
    const p = at(part.legs[0])
    return `<text x="${p.x}" y="${p.y - PITCH * 0.45}" class="pf-blab" data-id="${part.id}">${esc(part.lab)}</text>`
  })
  const dipPart = layout.parts.find(p => p.k === 'dip' && p.s <= view.stage)
  const top = dipPart ? Math.min(...dipPart.legs.map(h => h[1])) : 0
  const pins = (dipPart?.legs ?? []).map((h, i) => {
    const p = at(h)
    return `<text x="${p.x}" y="${h[1] === top ? p.y - PITCH * 0.5 : p.y - PITCH * 0.55}" class="pf-pin">${i + 1}</text>`
  })
  return legsOf.join('') + pins.join('')
}

export function perfboardSvg(layout: PerfLayout, view: PerfView): string {
  const at = projector(layout, view.side)
  const isStrip = view.type === 'strip'
  const layers = view.side === 'top'
    ? [boardBase(layout, 'top'), holesSvg(layout, false, at), isStrip ? linksSvg(layout, view, at) : '', partsSvg(layout, view, at)]
    : [
        boardBase(layout, 'bottom'),
        isStrip ? stripsSvg(layout, view.strip, at) : '',
        holesSvg(layout, !isStrip, at),
        isStrip ? cutsSvg(view.strip, 'bottom', at) : tracesSvg(layout, view, at),
        jointsSvg(layout, view, at),
        bottomLabels(layout, view, at)
      ]
  return layers.join('') + rulers(layout, at)
}

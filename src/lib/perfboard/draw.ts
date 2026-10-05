import type { Hole, PerfLayout, PerfPart, StripSpec } from '../../types/circuit'
import { resistorBands } from '../format'
import { expandPath, holeKey } from './grid'

export const PITCH = 22
const MARGIN = 34
const CHANNEL = PITCH * 0.9
const SOLDER = '#d5dbe3'
const COPPER = '#c27a3a'
const LEG = '#b8c0ca'

export type Side = 'top' | 'bottom'
export type LettersFrom = 'left' | 'right'

export interface PerfView {
  side: Side
  stage: number
  selected: string | null
  net: string | null
  icInserted: boolean
  hidden?: { parts: ReadonlySet<string>; traces: ReadonlySet<number>; cuts: ReadonlySet<number> }
  focusTrace?: number
  focusCut?: number
  lettersFrom?: LettersFrom
  ghosts?: ReadonlySet<string>
  gone?: ReadonlySet<string>
  ohmOf?: (id: string) => number | undefined
}

const partShown = (view: PerfView, p: PerfPart) => p.s <= view.stage && !view.hidden?.parts.has(p.id) && !view.gone?.has(p.id)

interface Pt {
  x: number
  y: number
}

type Project = (h: Hole) => Pt

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const isBreadboard = (layout: PerfLayout) => layout.look === 'breadboard'
const gapBefore = (layout: PerfLayout, y: number) => (layout.channelAfter !== undefined && y > layout.channelAfter ? CHANNEL : 0)

export function boardSize(layout: PerfLayout): { w: number; h: number } {
  return { w: MARGIN * 2 + (layout.cols - 1) * PITCH, h: MARGIN * 2 + (layout.rows - 1) * PITCH + gapBefore(layout, layout.rows - 1) }
}

function projector(layout: PerfLayout, side: Side): Project {
  return ([x, y]) => ({
    x: MARGIN + (side === 'bottom' ? layout.cols - 1 - x : x) * PITCH,
    y: MARGIN + y * PITCH + gapBefore(layout, y)
  })
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = UPPER.toLowerCase()
const letters = (i: number): string => (i < UPPER.length ? UPPER[i] : UPPER[Math.floor(i / UPPER.length) - 1] + UPPER[i % UPPER.length])
const letterIndex = (name: string): number =>
  name.length === 1 ? UPPER.indexOf(name) : (UPPER.indexOf(name[0]) + 1) * UPPER.length + UPPER.indexOf(name[1])
const colIndex = (layout: PerfLayout, x: number, from: LettersFrom) => (from === 'right' ? layout.cols - 1 - x : x)
const colLabel = (layout: PerfLayout, x: number, from: LettersFrom = 'left'): string =>
  isBreadboard(layout) ? String(x + 1) : letters(colIndex(layout, x, from))
const rowLabel = (layout: PerfLayout, y: number): string => (isBreadboard(layout) ? LOWER[y] ?? '?' : String(y + 1))
export const holeName = (layout: PerfLayout, [x, y]: Hole, from: LettersFrom = 'left'): string =>
  isBreadboard(layout) ? rowLabel(layout, y) + colLabel(layout, x) : colLabel(layout, x, from) + rowLabel(layout, y)

const HOLE_TAG = /⟦([A-Z]{1,2})(\d{1,2})⟧/g

const COLUMN_TAG = /⟦([A-Z]{1,2})⟧/g

export function holeText(text: string, layout: PerfLayout, from: LettersFrom = 'left'): string {
  return text
    .replace(HOLE_TAG, (_, col: string, row: string) => holeName(layout, [letterIndex(col), Number(row) - 1], from))
    .replace(COLUMN_TAG, (_, col: string) => colLabel(layout, letterIndex(col), from))
}

function rulers(layout: PerfLayout, at: Project, from: LettersFrom): string {
  const { w } = boardSize(layout)
  const cls = isBreadboard(layout) ? 'pf-ruler bb' : 'pf-ruler'
  const cols = Array.from({ length: layout.cols }, (_, x) => {
    const p = at([x, 0])
    return `<text x="${p.x}" y="${MARGIN - 21}" class="${cls}">${colLabel(layout, x, from)}</text>`
  })
  const rows = Array.from({ length: layout.rows }, (_, y) => {
    const p = at([0, y])
    return `<text x="12" y="${p.y + 4}" class="${cls}">${rowLabel(layout, y)}</text><text x="${w - 12}" y="${p.y + 4}" class="${cls}">${rowLabel(layout, y)}</text>`
  })
  return cols.join('') + rows.join('')
}

function boardBase(layout: PerfLayout, side: Side): string {
  const { w, h } = boardSize(layout)
  if (isBreadboard(layout)) {
    const y = MARGIN + (layout.channelAfter ?? 0) * PITCH + PITCH / 2
    return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="#efefe9" stroke="#b9b9ad" stroke-width="2"/>` +
      `<rect x="8" y="${y}" width="${w - 16}" height="${CHANNEL - 2}" rx="3" fill="#d7d7cf"/>`
  }
  const fill = side === 'top' ? '#d9bd84' : '#a7854f'
  return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="${fill}" stroke="#6b5531" stroke-width="2"/>`
}

function stripsSvg(layout: PerfLayout, spec: StripSpec, at: Project): string {
  const count = spec.axis === 'cols' ? layout.cols : layout.rows
  const length = spec.axis === 'cols' ? layout.rows : layout.cols
  const half = PITCH * 0.4
  return Array.from({ length: count }, (_, s) => {
    const a = at(spec.axis === 'cols' ? [s, 0] : [0, s])
    const b = at(spec.axis === 'cols' ? [s, length - 1] : [length - 1, s])
    return `<rect x="${Math.min(a.x, b.x) - half}" y="${Math.min(a.y, b.y) - half}" width="${Math.abs(b.x - a.x) + half * 2}" height="${Math.abs(b.y - a.y) + half * 2}" rx="3" fill="${COPPER}" opacity=".9"/>`
  }).join('')
}

function holesSvg(layout: PerfLayout, withPads: boolean, at: Project): string {
  const out: string[] = []
  const square = isBreadboard(layout)
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const p = at([x, y])
      if (withPads) out.push(`<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.36}" fill="${COPPER}"/>`)
      out.push(square
        ? `<rect x="${p.x - 3.5}" y="${p.y - 3.5}" width="7" height="7" rx="1.2" fill="#3b3b36"/>`
        : `<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.15}" fill="#2b2216"/>`)
    }
  }
  return out.join('')
}

function cutsSvg(spec: StripSpec, view: PerfView, at: Project): string {
  const side = view.side
  return spec.cuts.map((c, index) => {
    if (view.hidden?.cuts.has(index)) return ''
    const focus = view.focusCut === index
    const whole = Math.floor(c.at)
    const base = at(spec.axis === 'cols' ? [c.strip, whole] : [whole, c.strip])
    const shift = (c.at - whole) * PITCH
    const p = spec.axis === 'cols' ? { x: base.x, y: base.y + shift } : { x: base.x + (side === 'bottom' ? -shift : shift), y: base.y }
    const ring = focus ? `<circle cx="${p.x}" cy="${p.y}" r="${PITCH * 0.75}" fill="none" stroke="#ffb547" stroke-width="3"/>` : ''
    if (Number.isInteger(c.at)) return ring + `<circle class="pf-cut" cx="${p.x}" cy="${p.y}" r="${PITCH * 0.42}" fill="#3a2a18" stroke="#ff5d5d" stroke-width="2.5"/>`
    const len = PITCH * 0.5
    const line = spec.axis === 'cols'
      ? `x1="${p.x - len}" y1="${p.y}" x2="${p.x + len}" y2="${p.y}"`
      : `x1="${p.x}" y1="${p.y - len}" x2="${p.x}" y2="${p.y + len}"`
    return ring + `<g class="pf-cut"><line ${line} stroke="#2b2216" stroke-width="5"/><line ${line} stroke="#ff5d5d" stroke-width="2"/></g>`
  }).join('')
}

function tracesSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  return layout.traces.map((t, index) => {
    if (t.s > view.stage || view.hidden?.traces.has(index)) return ''
    const pts = expandPath(t.pts).map(at).map(p => `${p.x},${p.y}`).join(' ')
    const on = view.focusTrace === index || (view.focusTrace === undefined && view.net === t.net)
    const cls = ['pf-trace', on ? 'on' : '', t.s === view.stage ? 'fresh' : ''].filter(Boolean).join(' ')
    return `<g class="${cls}" data-net="${t.net}">` +
      `<polyline points="${pts}" fill="none" stroke="${SOLDER}" stroke-width="${PITCH * 0.42}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<polyline points="${pts}" fill="none" stroke="${layout.nets[t.net]?.c ?? '#888'}" stroke-width="${on ? 4 : 2}" stroke-linecap="round" stroke-linejoin="round" opacity="${on ? 1 : 0.75}"/></g>`
  }).join('')
}

function jointsSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  const holes = new Map<string, { h: Hole; net: string; id: string }>()
  layout.parts.filter(p => partShown(view, p) && !p.optional)
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
  const stretched = span > 2
  const r = PITCH * (span === 2 ? 0.85 : 0.72)
  const c = stretched ? { x: a.x + (b.x - a.x) * 0.3, y: a.y + (b.y - a.y) * 0.3 } : mid(a, b)
  const toward = (p: Pt, k: number) => ({ x: c.x + (p.x - c.x) / Math.hypot(p.x - c.x, p.y - c.y) * r * k, y: c.y + (p.y - c.y) / Math.hypot(p.x - c.x, p.y - c.y) * r * k })
  const minus = toward(b, 0.55)
  const plus = toward(a, 0.55)
  return (stretched ? legLine(a, b) + legDot(a) + legDot(b) : '') +
    `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="#24418a" stroke="#0f1d40" stroke-width="1.5"/>` +
    `<circle cx="${minus.x}" cy="${minus.y}" r="${r * 0.38}" fill="#c9d3e6" opacity=".9"/>` +
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
  const isVertical = legs[0].x === legs[6].x
  const x0 = Math.min(...xs) - PITCH * (isVertical ? 0.45 : 0.55)
  const x1 = Math.max(...xs) + PITCH * (isVertical ? 0.45 : 0.55)
  const y0 = Math.min(...ys) - PITCH * (isVertical ? 0.55 : 0.45)
  const y1 = Math.max(...ys) + PITCH * (isVertical ? 0.55 : 0.45)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rotate = isVertical ? ` transform="rotate(-90 ${cx} ${cy})"` : ''
  const inner = inserted
    ? `<rect x="${x0 + (isVertical ? 8 : 4)}" y="${y0 + (isVertical ? 4 : 8)}" width="${x1 - x0 - (isVertical ? 16 : 8)}" height="${y1 - y0 - (isVertical ? 8 : 16)}" rx="2" fill="#141414"/><text x="${cx}" y="${cy + 4}" class="pf-chip"${rotate}>CD40106</text>`
    : `<text x="${cx}" y="${cy + 4}" class="pf-chip dim"${rotate}>قاعدة فاضية</text>`
  const notch = isVertical ? `<path d="M${cx - 7} ${y0} a7 7 0 0 0 14 0" fill="#666"/>` : `<path d="M${x0} ${cy - 7} a7 7 0 0 1 0 14" fill="#666"/>`
  const dot = { x: legs[0].x + Math.sign(cx - legs[0].x) * PITCH * 0.6, y: legs[0].y + Math.sign(cy - legs[0].y) * PITCH * 0.6 }
  const pin1 = isVertical ? { x: dot.x, y: legs[0].y } : { x: legs[0].x, y: dot.y }
  return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="#2e2e2e" stroke="#777"/>` +
    notch + inner + legs.map(legDot).join('') + `<circle cx="${pin1.x}" cy="${pin1.y}" r="2.6" fill="#ffd24d"/>`
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

function wireBody(part: PerfPart, legs: Pt[], highlighted: boolean): string {
  const [a, b] = legs
  const line = `x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"`
  return `<line ${line} stroke="${highlighted ? '#ffb547' : '#111'}" stroke-width="${highlighted ? 8 : 7}" stroke-linecap="round"/>` +
    `<line ${line} stroke="${part.color ?? '#888'}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<circle cx="${a.x}" cy="${a.y}" r="3" fill="${LEG}"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="${LEG}"/>`
}

function partBody(part: PerfPart, layout: PerfLayout, view: PerfView, at: Project): string {
  const legs = part.legs.map(at)
  const first = part.legs[0]
  const last = part.legs[part.legs.length - 1]
  const span = Math.abs(first[0] - last[0]) + Math.abs(first[1] - last[1])
  switch (part.k) {
    case 'res': return resistor(legs[0], legs[1], view.ohmOf?.(part.id) ?? part.ohm ?? 0)
    case 'resUp': return standingResistor(legs[0], legs[1], view.ohmOf?.(part.id) ?? part.ohm ?? 0)
    case 'diode': return diode(legs[0], legs[1], false)
    case 'tvs': return diode(legs[0], legs[1], true)
    case 'can': return electrolytic(legs[0], legs[1], span)
    case 'ceramic': return ceramic(legs[0], legs[1])
    case 'to220': return to220(legs, part.face ?? 'down', part.val)
    case 'dip': return dip(legs, view.icInserted)
    case 'pad': return pad(part, layout, at)
    case 'wire': return wireBody(part, legs, view.net === part.nets[0])
  }
}

function canCenter(part: PerfPart, at: Project): Pt {
  const [a, b] = part.legs.map(at)
  const [h0, h1] = part.legs
  const isStretched = Math.abs(h0[0] - h1[0]) + Math.abs(h0[1] - h1[1]) > 2
  const k = isStretched ? 0.3 : 0.5
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + 4 }
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
    case 'can': return canCenter(part, at)
    default: return isVertical ? { x: c.x + PITCH * 0.75, y: c.y + 4 } : { x: c.x, y: c.y - PITCH * 0.55 }
  }
}

function partsSvg(layout: PerfLayout, view: PerfView, at: Project): string {
  return layout.parts.filter(p => partShown(view, p)).map(part => {
    const cls = ['pf-part', part.s === view.stage ? 'fresh' : '', view.selected === part.id ? 'sel' : '', part.optional ? 'opt' : '', view.ghosts?.has(part.id) ? 'ghost' : ''].filter(Boolean).join(' ')
    const l = labelPos(part, at)
    const labelClass = part.k === 'can' && !part.labelAt ? 'pf-lab in' : 'pf-lab'
    const label = part.lab ? `<text x="${l.x}" y="${l.y}" class="${labelClass}">${esc(part.lab)}</text>` : ''
    return `<g class="${cls}" data-id="${part.id}">${partBody(part, layout, view, at)}${label}</g>`
  }).join('')
}

function bottomLabels(layout: PerfLayout, view: PerfView, at: Project): string {
  const legsOf = layout.parts.filter(p => partShown(view, p) && p.k !== 'dip' && !p.optional && p.lab).map(part => {
    const p = at(part.legs[0])
    return `<text x="${p.x}" y="${p.y - PITCH * 0.45}" class="pf-blab" data-id="${part.id}">${esc(part.lab)}</text>`
  })
  const dipPart = layout.parts.find(p => p.k === 'dip' && p.s <= view.stage)
  const pts = (dipPart?.legs ?? []).map(at)
  const center = pts.length ? { x: pts.reduce((t, p) => t + p.x, 0) / pts.length, y: pts.reduce((t, p) => t + p.y, 0) / pts.length } : { x: 0, y: 0 }
  const isVertical = pts.length > 7 && pts[0].x === pts[6].x
  const pins = pts.map((p, i) => {
    const x = isVertical ? p.x + Math.sign(center.x - p.x) * PITCH * 0.6 : p.x
    const y = isVertical ? p.y + 3 : p.y + Math.sign(center.y - p.y) * PITCH * 0.62 + 3
    return `<text x="${x}" y="${y}" class="pf-pin">${i + 1}</text>`
  })
  return legsOf.join('') + pins.join('')
}

export function perfboardSvg(layout: PerfLayout, view: PerfView): string {
  const side = isBreadboard(layout) ? 'top' : view.side
  const at = projector(layout, side)
  const strips = layout.strips
  const layers = side === 'top'
    ? [boardBase(layout, 'top'), holesSvg(layout, false, at), partsSvg(layout, view, at)]
    : [
        boardBase(layout, 'bottom'),
        strips ? stripsSvg(layout, strips, at) : '',
        holesSvg(layout, !strips, at),
        strips ? cutsSvg(strips, view, at) : tracesSvg(layout, view, at),
        jointsSvg(layout, view, at),
        bottomLabels(layout, view, at)
      ]
  return layers.join('') + rulers(layout, at, view.lettersFrom ?? 'left')
}

const THUMB_PAD: Partial<Record<PerfPart['k'], number>> = { to220: 2.1, dip: 1.2, can: 1.2, pad: 1.4 }

export function partThumbnail(layout: PerfLayout, part: PerfPart): { viewBox: string; svg: string } {
  const at = projector(layout, 'top')
  const pts = part.legs.map(at)
  const pad = PITCH * (THUMB_PAD[part.k] ?? 0.9)
  const x0 = Math.min(...pts.map(p => p.x)) - pad
  const y0 = Math.min(...pts.map(p => p.y)) - pad
  const w = Math.max(...pts.map(p => p.x)) - x0 + pad
  const h = Math.max(...pts.map(p => p.y)) - y0 + pad
  const view: PerfView = { side: 'top', stage: Infinity, selected: null, net: null, icInserted: false }
  const fill = isBreadboard(layout) ? '#efefe9' : '#d9bd84'
  const body = part.k === 'pad'
    ? `<line x1="${pts[0].x - pad}" y1="${pts[0].y}" x2="${pts[0].x + pad}" y2="${pts[0].y}" stroke="#000" stroke-width="8" stroke-linecap="round"/><line x1="${pts[0].x - pad}" y1="${pts[0].y}" x2="${pts[0].x + pad}" y2="${pts[0].y}" stroke="${part.color ?? '#888'}" stroke-width="5.5" stroke-linecap="round"/>`
    : partBody(part, layout, view, at)
  return {
    viewBox: `${x0} ${y0} ${w} ${h}`,
    svg: `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="${fill}"/>` + body
  }
}

export function holePoint(layout: PerfLayout, h: Hole, side: Side = 'top'): { x: number; y: number } {
  return projector(layout, side)(h)
}

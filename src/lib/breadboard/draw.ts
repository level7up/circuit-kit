import type { BoardPart, Point } from '../../types/circuit'
import { resistorBands, round1 } from '../format'
import { ROWS, colX, holeXY } from './geometry'
import { drawLed, ledLensCenter } from './led'

export interface DrawContext {
  wireColor: (net: string) => string
  ohm: (part: BoardPart) => number | undefined
  text: (part: BoardPart) => string | undefined
  color: () => string
  variant: (part: BoardPart) => string | undefined
  dead: () => boolean
}

type BodyFn = (len: number, thick: number) => string

const lead = (a: Point, b: Point) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bb-lead"/>`
const foot = (a: Point) => `<circle cx="${a.x}" cy="${a.y}" r="2.6" class="bb-foot"/>`
const hitLine = (a: Point, b: Point) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bb-hitw"/>`

function axial(a: Point, b: Point, len: number, thick: number, body: BodyFn): string {
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return hitLine(a, b) + lead(a, b) + foot(a) + foot(b) + `<g transform="translate(${round1(mx)} ${round1(my)}) rotate(${round1(ang)})">${body(len, thick)}</g>`
}

function resistorBody(ohm: number): BodyFn {
  const bands = resistorBands(ohm)
  return (L, T) => {
    const h = L / 2
    const xs = [-h + 6, -h + 10.5, -h + 15, h - 7]
    return `<rect x="${-h}" y="${-T / 2}" width="${L}" height="${T}" rx="${T / 2}" class="bb-res"/>`
      + bands.map((c, i) => `<rect x="${xs[i] - 1.4}" y="${-T / 2 + .6}" width="2.8" height="${T - 1.2}" style="fill:${c}"/>`).join('')
      + `<rect x="${-h + 3}" y="${-T / 2 + 1.6}" width="${L - 6}" height="1.8" rx=".9" class="bb-shine"/>`
  }
}

const diodeBody = (cls: string): BodyFn => (L, T) =>
  `<rect x="${-L / 2}" y="${-T / 2}" width="${L}" height="${T}" rx="2.5" class="${cls}"/><rect x="${L / 2 - 8}" y="${-T / 2}" width="4" height="${T}" class="bb-stripe"/><rect x="${-L / 2 + 3}" y="${-T / 2 + 1.4}" width="${L - 6}" height="1.6" rx=".8" class="bb-shine"/>`

function ceramic(a: Point, b: Point): string {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return hitLine(a, b) + lead(a, m) + lead(b, m) + foot(a) + foot(b) + `<ellipse cx="${m.x}" cy="${m.y}" rx="9.5" ry="7.5" class="bb-cer"/><text x="${m.x}" y="${m.y + 2.4}" class="bb-cert">104</text>`
}

function can(pos: Point, neg: Point, r: number): string {
  const cx = (pos.x + neg.x) / 2
  const cy = (pos.y + neg.y) / 2
  const ang = Math.atan2(neg.y - pos.y, neg.x - pos.x)
  const pt = (a: number) => `${round1(cx + r * Math.cos(a))},${round1(cy + r * Math.sin(a))}`
  const v = round1(r * .38)
  return `<circle cx="${cx}" cy="${cy}" r="${r}" class="bb-can"/><path d="M${cx},${cy} L${pt(ang - .8)} A${r},${r} 0 0 1 ${pt(ang + .8)} Z" class="bb-canstripe"/><circle cx="${cx}" cy="${cy}" r="${round1(r * .7)}" class="bb-cantop"/><path d="M${cx - v},${cy} L${cx + v},${cy} M${cx},${cy - v} L${cx},${cy + v}" class="bb-canvent"/>`
}

function to220(pins: string[], label: string, id: string): string {
  const ps = pins.map(h => holeXY(h))
  const cx = ps[1].x
  const y0 = ps[0].y
  const w = 72
  const legTop = y0 - 16
  const bodyTop = legTop - 62
  const tabTop = bodyTop - 44
  return ps.map(p => `<rect x="${p.x - 2.2}" y="${legTop}" width="4.4" height="${y0 - legTop}" class="bb-leg"/>` + foot(p)).join('')
    + `<rect x="${cx - w / 2}" y="${tabTop}" width="${w}" height="${bodyTop - tabTop + 8}" rx="3" class="bb-tab"/><circle cx="${cx}" cy="${tabTop + 19}" r="7.5" class="bb-tabhole"/>`
    + `<rect x="${cx - w / 2}" y="${bodyTop}" width="${w}" height="62" rx="3" class="bb-ic"/><text x="${cx}" y="${bodyTop + 27}" class="bb-ict">${label}</text><text x="${cx}" y="${bodyTop + 42}" class="bb-icid">${id}</text>`
    + ps.map((p, i) => `<text x="${p.x}" y="${legTop - 6}" class="bb-icpin">${i + 1}</text>`).join('')
}

function dip(pins: string[], label: string, id: string): string {
  const half = pins.length / 2
  const first = holeXY(pins[0])
  const last = holeXY(pins[half - 1])
  const e = ROWS.e
  const f = ROWS.f
  const yT = e + 7
  const yB = f - 7
  const x1 = first.x - 11
  const x2 = last.x + 11
  const my = (yT + yB) / 2
  let s = ''
  for (let i = 0; i < half; i++) {
    const x = first.x + i * (last.x - first.x) / (half - 1)
    s += `<rect x="${x - 3.5}" y="${e - 2}" width="7" height="${yT - e + 3}" class="bb-pin"/><rect x="${x - 3.5}" y="${yB - 1}" width="7" height="${f - yB + 3}" class="bb-pin"/>`
    s += `<text x="${x}" y="${yT + 8}" class="bb-dipn">${pins.length - i}</text><text x="${x}" y="${yB - 3}" class="bb-dipn">${i + 1}</text>`
  }
  return s + `<rect x="${x1}" y="${yT}" width="${x2 - x1}" height="${yB - yT}" rx="3" class="bb-ic"/><path d="M${x1},${my - 6} A6,6 0 0 1 ${x1},${my + 6} Z" class="bb-notch"/><circle cx="${first.x}" cy="${yB - 7}" r="2.4" class="bb-dot1"/><text x="${(x1 + x2) / 2 + 6}" y="${my + 4}" class="bb-ict">${id} ${label}</text>`
}

function toward(p: Point, q: Point, r: number): string {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const l = Math.hypot(dx, dy) || 1
  const k = Math.min(r, l / 2) / l
  return `${round1(p.x + dx * k)},${round1(p.y + dy * k)}`
}

export function roundedPath(pts: Point[]): string {
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) d += ` L${toward(pts[i], pts[i - 1], 8)} Q${pts[i].x},${pts[i].y} ${toward(pts[i], pts[i + 1], 8)}`
  const l = pts[pts.length - 1]
  return d + ` L${l.x},${l.y}`
}

function wire(pts: (string | Point)[], color: string): string {
  const d = roundedPath(pts.map(holeXY))
  return `<path d="${d}" class="bb-hitw"/><path d="${d}" class="bb-wire-o"/><path d="${d}" class="bb-wire" style="stroke:${color}"/><path d="${d}" class="bb-wire-hi"/>`
}

const tips = (hs: string[]) => hs.map(h => { const p = holeXY(h); return `<circle cx="${p.x}" cy="${p.y}" r="2.8" class="bb-tip"/>` }).join('')

function adapter(at: Point): string {
  const { x, y } = at
  return `<rect x="${x}" y="${y}" width="62" height="82" rx="9" class="bb-adp"/><text x="${x + 31}" y="${y + 26}" class="bb-adpt">12V</text><text x="${x + 31}" y="${y + 42}" class="bb-adps">DC · 1A</text><text x="${x + 31}" y="${y + 70}" class="bb-adps">أدابتر</text><circle cx="${x + 62}" cy="${y + 34}" r="3.5" class="bb-term-r"/><circle cx="${x + 62}" cy="${y + 62}" r="3.5" class="bb-term-k"/>`
}

function fuse(part: BoardPart, color: string, label: string): string {
  const pts = part.pts ?? []
  const at = part.at ?? { x: 0, y: 0 }
  const before = pts.filter(p => typeof p !== 'string' && p.x <= at.x)
  const after = pts.filter(p => typeof p === 'string' || p.x >= at.x + 36)
  return wire([...before, { x: at.x + 2, y: at.y + 10 }], color) + wire([{ x: at.x + 34, y: at.y + 10 }, ...after], color)
    + tips(part.pins.map(x => x[0]))
    + `<rect x="${at.x}" y="${at.y}" width="36" height="20" rx="9" class="bb-fuse"/><text x="${at.x + 18}" y="${at.y + 13.5}" class="bb-fuset">${label}</text>`
}

function lampT10(at: Point, caption: string): string {
  const { x, y } = at
  const chip = (cx: number, cy: number) => `<rect x="${cx}" y="${cy}" width="10" height="10" rx="1.5" class="bb-chip"/>`
  return `<rect x="${x}" y="${y}" width="30" height="128" rx="6" class="bb-sock"/><rect x="${x - 4}" y="${y + 10}" width="8" height="8" class="bb-pin"/><rect x="${x - 4}" y="${y + 110}" width="8" height="8" class="bb-pin"/>`
    + `<rect x="${x + 30}" y="${y + 36}" width="54" height="56" rx="12" class="bb-bulb"/>` + chip(x + 43, y + 45) + chip(x + 61, y + 45) + chip(x + 43, y + 73) + chip(x + 61, y + 73)
    + `<text x="${x + 15}" y="${y - 8}" class="bb-matt">LAMP −</text><text x="${x + 15}" y="${y + 146}" class="bb-matt">LAMP +</text><text x="${x + 57}" y="${y + 112}" class="bb-matt">${caption}</text>`
}

export function drawPart(part: BoardPart, ctx: DrawContext): string {
  const ps = part.pins.map(x => holeXY(x[0]))
  const holes = part.pins.map(x => x[0])
  const net = part.pins[0]?.[1] ?? ''
  switch (part.k) {
    case 'res': return axial(ps[0], ps[1], 30, 10, resistorBody(ctx.ohm(part) ?? part.ohm ?? 0))
    case 'diode': return axial(ps[0], ps[1], 26, 9, diodeBody('bb-dio'))
    case 'tvs': return axial(ps[0], ps[1], 30, 11, diodeBody('bb-tvs'))
    case 'ceramic': return ceramic(ps[0], ps[1])
    case 'can': return can(ps[0], ps[1], part.r ?? 13)
    case 'to220': return to220(holes, part.lbl ?? '', part.id)
    case 'dip': return dip(holes, part.lbl ?? '', part.id)
    case 'jumper': return wire([holes[0], ...(part.via ?? []), holes[1]], ctx.wireColor(net)) + tips(holes)
    case 'wire': return wire(part.pts ?? [], ctx.wireColor(net)) + tips(holes)
    case 'adapter': return adapter(part.at ?? { x: 0, y: 0 })
    case 'fuse': return fuse(part, ctx.wireColor(net), ctx.text(part) ?? '')
    case 'lamp': return lampT10(part.at ?? { x: 0, y: 0 }, ctx.text(part) ?? 'T10 LED')
    case 'led': return drawLed(part.at ?? { x: 0, y: 0 }, ctx.text(part) ?? 'LED', ctx.color(), ctx.variant(part), ctx.dead())
    case 'rt': {
      const [a, b] = (part.pts ?? []).map(holeXY)
      return axial(a, b, 30, 10, resistorBody(ctx.ohm(part) ?? part.ohm ?? 0))
    }
  }
}

export interface GlowSpot extends Point {
  r: number
  core: Point & { r: number }
}

export function glowCenter(part: BoardPart, variant?: string): GlowSpot {
  const at = part.at ?? { x: 0, y: 0 }
  if (part.k === 'led') {
    const lens = ledLensCenter(at, variant)
    return { x: lens.x, y: lens.y, r: 60, core: lens }
  }
  return { x: at.x + 67, y: at.y + 64, r: 78, core: { x: at.x + 57, y: at.y + 64, r: 22 } }
}

export function boardBaseSvg(): string {
  const L = 130
  const R = colX(63) + 20
  const T = 110
  const B = 444
  let s = `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" rx="8" class="bb-board"/><rect x="${L}" y="${ROWS.e + 13}" width="${R - L}" height="${ROWS.f - ROWS.e - 26}" class="bb-chan"/>`
  const railLines: [number, string][] = [[121, 'r'], [157, 'b'], [397, 'b'], [433, 'r']]
  railLines.forEach(([y, c]) => { s += `<line x1="${colX(2) - 6}" y1="${y}" x2="${colX(62) + 6}" y2="${y}" class="bb-rl-${c}"/>` })
  return s
}

export function boardHolesSvg(railLabels: [string, string, 'r' | 'b'][]): string {
  const L = 130
  const R = colX(63) + 20
  let s = railLabels.map(([r, t, c]) => `<text x="${L + 5}" y="${ROWS[r] + 3}" class="bb-rlt bb-rlt-${c}">${t}</text>`).join('')
  const hole = (x: number, y: number) => `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" rx="1.2" class="bb-hole"/>`
  for (const r of ['tp', 'tn', 'bn', 'bp']) for (let c = 2; c <= 62; c++) if ((c - 2) % 6 !== 5) s += hole(colX(c), ROWS[r])
  for (const r of 'abcdefghij') {
    for (let c = 1; c <= 63; c++) s += hole(colX(c), ROWS[r])
    s += `<text x="${L + 9}" y="${ROWS[r] + 3}" class="bb-num">${r}</text><text x="${R - 9}" y="${ROWS[r] + 3}" class="bb-num">${r}</text>`
  }
  for (const c of [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]) s += `<text x="${colX(c)}" y="170" class="bb-num">${c}</text><text x="${colX(c)}" y="393" class="bb-num">${c}</text>`
  return s
}

export function boardDefsSvg(): string {
  return `<defs><linearGradient id="bbMetal" x1="0" x2="1"><stop offset="0" stop-color="#8f959d"/><stop offset=".5" stop-color="#e4e7eb"/><stop offset="1" stop-color="#8a9098"/></linearGradient>`
    + `<radialGradient id="bbGlowG"><stop offset="0" stop-color="#fff6d0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffbf47" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>`
    + `<pattern id="bbMat" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" class="bb-mat"/><path d="M36 0 L0 0 0 36" class="bb-matl"/></pattern>`
    + `<filter id="bbSh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="1.2" dy="2" stdDeviation="1.3" flood-color="#000" flood-opacity=".35"/></filter></defs>`
}

export const Z_ORDER: Record<string, number> = { res: 1, diode: 1, tvs: 1, ceramic: 1, dip: 2, can: 3, jumper: 4, to220: 5, wire: 6, fuse: 6, adapter: 6, lamp: 6, rt: 7, led: 6 }

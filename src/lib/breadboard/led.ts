import type { Point } from '../../types/circuit'

export type LedShape = '3mm' | '5mm' | '10mm' | 'straw' | 'smd' | 'rgb'
export type LedLens = 'diffused' | 'clear'

interface LedGeometry {
  diameter: number
  flange: number
  body: number
  domeRatio: number
}

const PX_PER_MM = 5.6
const LEG_X = 22
const AXIS_DY = 64

const GEOMETRY: Record<Exclude<LedShape, 'smd'>, LedGeometry> = {
  '3mm': { diameter: 3, flange: 3.8, body: 3.5, domeRatio: 1 },
  '5mm': { diameter: 5, flange: 5.8, body: 5.5, domeRatio: 1 },
  '10mm': { diameter: 10, flange: 11, body: 9, domeRatio: 1 },
  straw: { diameter: 4.8, flange: 5.8, body: 1.8, domeRatio: 0.35 },
  rgb: { diameter: 5, flange: 5.8, body: 5.5, domeRatio: 1 }
}

export function parseVariant(variant: string | undefined): { shape: LedShape; lens: LedLens } {
  const [shape, lens] = (variant ?? '5mm:diffused').split(':')
  return { shape: (shape in GEOMETRY || shape === 'smd' ? shape : '5mm') as LedShape, lens: lens === 'clear' ? 'clear' : 'diffused' }
}

const lead = (d: string) => `<path d="${d}" class="bb-lead" fill="none"/>`

function lensGradient(color: string, lens: LedLens, dead: boolean): string {
  const tint = dead ? '#3b2a22' : color
  const [a, b] = lens === 'clear' ? ['.35', '.55'] : ['.82', '.95']
  return `<defs><linearGradient id="bbLedLens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${dead ? 0 : .45}"/><stop offset=".35" stop-color="${tint}" stop-opacity="${a}"/><stop offset="1" stop-color="${tint}" stop-opacity="${b}"/></linearGradient></defs>`
}

function internals(x0: number, y0: number, len: number, r: number, lens: LedLens): string {
  const o = lens === 'clear' ? .75 : .3
  const cupEnd = x0 + len * .62
  return `<g opacity="${o}"><path d="M${x0},${y0 - r * .75} L${cupEnd - 4},${y0 - r * .75} L${cupEnd},${y0 - r * .15} L${cupEnd - 6},${y0 - r * .15} L${cupEnd - 8},${y0 - r * .45} L${x0},${y0 - r * .45} Z" class="bb-led-metal"/>`
    + `<rect x="${x0}" y="${y0 + r * .2}" width="${len * .45}" height="${r * .28}" class="bb-led-metal"/>`
    + `<path d="M${x0 + len * .45},${y0 + r * .3} Q${cupEnd},${y0 + r * .2} ${cupEnd - 3},${y0 - r * .2}" class="bb-led-wire"/></g>`
}

function throughHole(at: Point, g: LedGeometry, color: string, lens: LedLens, dead: boolean, rgb: boolean): string {
  const { x, y } = at
  const y0 = y + AXIS_DY
  const r = g.diameter * PX_PER_MM / 2
  const fr = g.flange * PX_PER_MM / 2
  const fx = x + LEG_X
  const bx = fx + 6
  const len = g.body * PX_PER_MM
  const domeR = r * g.domeRatio
  const legGap = Math.min(r * .55, 9)
  let s = lead(`M${x},${y + 14} L${x + 10},${y + 14} L${fx},${y0 - legGap}`)
    + lead(`M${x},${y + 114} L${x + 6},${y + 114} L${x + 12},${y0 + legGap + 16} L${fx - 6},${y0 + legGap + 4} L${fx},${y0 + legGap}`)
  if (rgb) s += lead(`M${fx - 12},${y0 - legGap * .35} L${fx},${y0 - legGap * .35}`) + lead(`M${fx - 12},${y0 + legGap * .35} L${fx},${y0 + legGap * .35}`)
  s += lensGradient(color, lens, dead)
  s += `<path d="M${fx},${y0 - fr + 3} L${fx + 6},${y0 - fr + 3} L${fx + 6},${y0 + fr} L${fx},${y0 + fr} Z" class="bb-led-flange" style="fill:url(#bbLedLens)"/>`
  s += `<path d="M${bx},${y0 - r} L${bx + len},${y0 - r} A${domeR},${r} 0 0 1 ${bx + len},${y0 + r} L${bx},${y0 + r} Z" class="bb-led-body" style="fill:url(#bbLedLens)"/>`
  s += internals(bx, y0, len, r, lens)
  s += `<ellipse cx="${bx + len + domeR * .35}" cy="${y0 - r * .45}" rx="${Math.max(2, domeR * .35)}" ry="${Math.max(1.5, r * .16)}" class="bb-led-shine"/>`
  return s
}

function smd(at: Point, color: string, dead: boolean): string {
  const { x, y } = at
  const y0 = y + AXIS_DY
  const px = x + 26
  return lead(`M${x},${y + 14} L${px + 8},${y + 14} L${px + 8},${y0 - 12}`) + lead(`M${x},${y + 114} L${px + 8},${y + 114} L${px + 8},${y0 + 12}`)
    + `<rect x="${px}" y="${y0 - 16}" width="36" height="32" rx="3" class="bb-led-pcb"/><rect x="${px + 4}" y="${y0 - 13}" width="8" height="6" class="bb-led-pad"/><rect x="${px + 4}" y="${y0 + 7}" width="8" height="6" class="bb-led-pad"/>`
    + `<rect x="${px + 14}" y="${y0 - 7}" width="16" height="14" rx="1.5" class="bb-led-smd"/><circle cx="${px + 22}" cy="${y0}" r="4.5" style="fill:${dead ? '#3b2a22' : color}" opacity=".9"/>`
}

export function drawLed(at: Point, caption: string, color: string, variant: string | undefined, dead: boolean): string {
  const { shape, lens } = parseVariant(variant)
  const body = shape === 'smd' ? smd(at, color, dead) : throughHole(at, GEOMETRY[shape], color, lens, dead, shape === 'rgb')
  const { x, y } = at
  return body + `<text x="${x + 15}" y="${y + 4}" class="bb-matt">− القصيرة</text><text x="${x + 15}" y="${y + 134}" class="bb-matt">+ الطويلة</text><text x="${x + 65}" y="${y + 112}" class="bb-matt">${caption}</text>`
}

export function ledLensCenter(at: Point, variant: string | undefined): Point & { r: number } {
  const { shape } = parseVariant(variant)
  const y0 = at.y + AXIS_DY
  if (shape === 'smd') return { x: at.x + 48, y: y0, r: 5 }
  const g = GEOMETRY[shape]
  const r = g.diameter * PX_PER_MM / 2
  return { x: at.x + LEG_X + 6 + g.body * PX_PER_MM, y: y0, r: Math.max(5, r * .8) }
}

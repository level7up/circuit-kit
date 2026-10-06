export const SCENE_W = 600
export const SCENE_H = 340

export type Pt = [x: number, y: number]

export const COLORS = {
  copper: '#d08a3a',
  pcb: '#f2efe6',
  ledOff: '#ddd6bd',
  ledOn: '#fffbe8',
  glow: '#eef5ff',
  plus: '#ff5d5d',
  minus: '#5aa9ff',
  orange: '#ff9f43',
  blue: '#3b82f6',
  ok: '#3ddc84',
  bad: '#ff5d5d',
  ink: '#e7ecf5',
  muted: '#9aa6bd',
  amber: '#ffb547'
}

export interface PieceOpts {
  len?: number
  lit?: boolean
  pulseMarks?: boolean
}

const PIECE_H = 30
const PAD_W = 9
const PAD_H = 8
const LED_W = 15
const LED_H = 11

export function label(x: number, y: number, text: string, opts: { size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number } = {}): string {
  const { size = 14, color = COLORS.ink, anchor = 'middle', weight = 700 } = opts
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" class="sc-txt">${text}</text>`
}

export function piece(x: number, y: number, rot: number, opts: PieceOpts = {}): string {
  const { len = 150, lit = false } = opts
  const pads = [0, len - PAD_W].map(px =>
    `<rect x="${px}" y="${-PAD_H - 3}" width="${PAD_W}" height="${PAD_H}" fill="${COLORS.copper}"/>` +
    `<rect x="${px}" y="3" width="${PAD_W}" height="${PAD_H}" fill="${COLORS.copper}"/>`).join('')
  const leds = [1, 3, 5].map(k => {
    const cx = (len * k) / 6
    const halo = lit ? `<circle cx="${cx}" cy="0" r="16" fill="${COLORS.glow}" opacity=".55" filter="url(#sc-blur)"/>` : ''
    return halo + `<rect x="${cx - LED_W / 2}" y="${-LED_H / 2}" width="${LED_W}" height="${LED_H}" rx="2" fill="${lit ? COLORS.ledOn : COLORS.ledOff}" stroke="#a49d84"/>`
  }).join('')
  const signs = label(PAD_W + 7, -5, '+', { size: 10, color: '#8a4b10' }) + label(PAD_W + 7, 12, '−', { size: 10, color: '#8a4b10' })
  return `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<rect x="0" y="${-PIECE_H / 2}" width="${len}" height="${PIECE_H}" rx="2" fill="${COLORS.pcb}" stroke="#bdb6a0"/>` +
    `<line x1="${PAD_W}" y1="-12" x2="${len - PAD_W}" y2="-12" stroke="${COLORS.copper}" stroke-width="1.2" opacity=".6"/>` +
    `<line x1="${PAD_W}" y1="12" x2="${len - PAD_W}" y2="12" stroke="${COLORS.copper}" stroke-width="1.2" opacity=".6"/>` +
    pads + leds + signs + `</g>`
}

export function cutMark(x: number, y: number, pulse = false): string {
  return `<g class="${pulse ? 'sc-pulse' : ''}"><line x1="${x}" y1="${y - 24}" x2="${x}" y2="${y + 24}" stroke="${COLORS.amber}" stroke-width="2" stroke-dasharray="4 3"/>` +
    label(x, y - 28, '✂', { size: 15, color: COLORS.amber }) + `</g>`
}

export function strip(x: number, y: number, count: number, opts: PieceOpts = {}): string {
  const len = opts.len ?? 150
  const pieces = Array.from({ length: count }, (_, i) => piece(x + i * len, y, 0, opts)).join('')
  const marks = Array.from({ length: count - 1 }, (_, i) => cutMark(x + (i + 1) * len, y, opts.pulseMarks)).join('')
  return pieces + marks
}

export function wire(points: Pt[], color: string, width = 4): string {
  const d = points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')
  return `<path d="${d}" fill="none" stroke="#111" stroke-width="${width + 2.5}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
}

export function adapter(x: number, y: number, plus: Pt, minus: Pt): string {
  return `<rect x="${x}" y="${y}" width="96" height="64" rx="10" fill="#1d2230" stroke="#4a5263" stroke-width="2"/>` +
    `<rect x="${x - 14}" y="${y + 20}" width="14" height="8" fill="#9aa6bd"/><rect x="${x - 14}" y="${y + 36}" width="14" height="8" fill="#9aa6bd"/>` +
    label(x + 48, y + 28, 'أدابتر', { size: 13 }) + label(x + 48, y + 48, '12V 1A', { size: 13, color: COLORS.amber }) +
    wire([[x + 96, y + 26], [plus[0] - 30, y + 26], [plus[0] - 30, plus[1]], plus], COLORS.plus, 3) +
    wire([[x + 96, y + 40], [minus[0] - 44, y + 40], [minus[0] - 44, minus[1]], minus], '#2b2b2b', 3)
}

export function meter(x: number, y: number, reading: string, red?: Pt, black?: Pt): string {
  const probes = (red ? wire([[x + 22, y + 104], [x + 22, y + 124], red], COLORS.plus, 2.5) : '') +
    (black ? wire([[x + 48, y + 104], [x + 48, y + 130], black], '#2b2b2b', 2.5) : '')
  return probes + `<rect x="${x}" y="${y}" width="70" height="104" rx="10" fill="#f2c94c" stroke="#9a7a1a" stroke-width="2"/>` +
    `<rect x="${x + 8}" y="${y + 10}" width="54" height="30" rx="4" fill="#c9d6b8"/>` +
    label(x + 35, y + 31, reading, { size: 14, color: '#1b2333', weight: 800 }) +
    `<circle cx="${x + 35}" cy="${y + 70}" r="17" fill="#2b2b2b"/><line x1="${x + 35}" y1="${y + 70}" x2="${x + 35}" y2="${y + 56}" stroke="#ddd" stroke-width="3"/>`
}

export function arrow(from: Pt, to: Pt, color: string = COLORS.amber): string {
  const [x1, y1] = from
  const [x2, y2] = to
  const a = Math.atan2(y2 - y1, x2 - x1)
  const head = (s: number) => `${x2 - 12 * Math.cos(a + s)} ${y2 - 12 * Math.sin(a + s)}`
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3"/>` +
    `<path d="M${head(0.45)} L${x2} ${y2} L${head(-0.45)}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`
}

export const tick = (x: number, y: number): string => label(x, y, '✓', { size: 30, color: COLORS.ok, weight: 900 })
export const cross = (x: number, y: number): string => label(x, y, '✗', { size: 30, color: COLORS.bad, weight: 900 })

export interface HexOpts {
  len?: number
  lit?: boolean
  count?: number
  links?: boolean
  numbers?: boolean
  smooth?: boolean
}

const CORNER_GAP = 9

export function hexVertices(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = ((-120 + 60 * k) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}

export interface Side {
  start: Pt
  rot: number
  len: number
  mid: Pt
}

export function hexSides(cx: number, cy: number, r: number): Side[] {
  const v = hexVertices(cx, cy, r)
  return v.map((p, i) => {
    const q = v[(i + 1) % 6]
    const a = Math.atan2(q[1] - p[1], q[0] - p[0])
    const start: Pt = [p[0] + CORNER_GAP * Math.cos(a), p[1] + CORNER_GAP * Math.sin(a)]
    return { start, rot: (a * 180) / Math.PI, len: r - 2 * CORNER_GAP, mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] }
  })
}

export function hexRing(cx: number, cy: number, opts: HexOpts = {}): string {
  const { len = 90, lit = false, count = 6, links = true, numbers = false, smooth = false } = opts
  const sides = hexSides(cx, cy, len).slice(0, count)
  const pieces = sides.map(s => piece(s.start[0], s.start[1], s.rot, { len: s.len, lit: lit && !smooth })).join('')
  const joints = links ? sides.slice(1).map((s, i) => {
    const prev = sides[i]
    const end = (sign: '+' | '-') => padAt(prev.start[0], prev.start[1], prev.rot, prev.len, 'end', sign)
    const begin = (sign: '+' | '-') => padAt(s.start[0], s.start[1], s.rot, s.len, 'start', sign)
    return wire([end('+'), begin('+')], COLORS.orange, 2.5) + wire([end('-'), begin('-')], COLORS.blue, 2.5)
  }).join('') : ''
  const marks = numbers ? sides.map((s, i) => {
    const x = s.mid[0] + (cx - s.mid[0]) * 0.42
    const y = s.mid[1] + (cy - s.mid[1]) * 0.42
    return `<rect x="${x - 13}" y="${y - 11}" width="26" height="22" rx="5" fill="#1b2333" stroke="#e7ecf5" stroke-width="1.5"/>` + label(x, y + 5, String(i + 1), { size: 14, weight: 900 })
  }).join('') : ''
  const glow = smooth
    ? `<circle cx="${cx}" cy="${cy}" r="${len * 0.93}" fill="none" stroke="${COLORS.glow}" stroke-width="26" opacity=".5" filter="url(#sc-blur)"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${len * 0.93}" fill="none" stroke="#fdfdfb" stroke-width="16" opacity=".95"/>`
    : ''
  return pieces + joints + marks + glow
}

export function scene(...parts: string[]): string {
  return parts.join('')
}

export function padAt(x: number, y: number, rot: number, len: number, end: 'start' | 'end', sign: '+' | '-'): Pt {
  const lx = end === 'start' ? 4.5 : len - 4.5
  const ly = sign === '+' ? -7 : 7
  const a = (rot * Math.PI) / 180
  return [x + lx * Math.cos(a) - ly * Math.sin(a), y + lx * Math.sin(a) + ly * Math.cos(a)]
}

export function battery(x: number, y: number, minusOff = false): string {
  return `<rect x="${x}" y="${y}" width="150" height="90" rx="8" fill="#20252f" stroke="#4a5263" stroke-width="2"/>` +
    `<rect x="${x + 18}" y="${y - 14}" width="26" height="14" fill="${COLORS.plus}"/>` +
    `<rect x="${x + 106}" y="${y - 14}" width="26" height="14" fill="#9aa6bd"/>` +
    label(x + 31, y + 30, '+', { size: 22, color: COLORS.plus }) + label(x + 119, y + 30, '−', { size: 22 }) +
    label(x + 75, y + 66, 'بطارية 12V', { size: 13, color: COLORS.muted }) +
    wire([[x + 119, y - 14], [x + 119, y - (minusOff ? 70 : 40)], [x + 200, y - (minusOff ? 70 : 40)]], '#2b2b2b', 5)
}

export function ringGlyph(cx: number, cy: number, r: number, lit = true): string {
  const glow = lit ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS.glow}" stroke-width="${r * 0.5}" opacity=".5" filter="url(#sc-blur)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fdfdfb" stroke-width="${Math.max(4, r * 0.18)}"/>` : ''
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3a4252" stroke-width="${Math.max(5, r * 0.22)}"/>` +
    glow
}

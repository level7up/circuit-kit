export function fmtR(v: number): string {
  if (!v) return 'بدون'
  if (v >= 1e6) return v / 1e6 + 'MΩ'
  if (v >= 1e3) return v / 1e3 + 'kΩ'
  return v + 'Ω'
}

export function fmtC(v: number): string {
  return +(v * 1e6).toFixed(1) + 'µF'
}

export function fmtV(v: number): string {
  return v.toFixed(2) + ' V'
}

export const round1 = (n: number): number => +n.toFixed(1)

const BAND_COLORS = ['#161616', '#7a4a1e', '#d42a2a', '#f07a1a', '#f2d21b', '#2f9e44', '#2563eb', '#8b3fd9', '#8a8a8a', '#f5f5f5']
const GOLD = '#c9a227'

export function resistorBands(ohm: number): string[] {
  const exp = Math.floor(Math.log10(ohm)) - 1
  const digits = Math.round(ohm / 10 ** exp)
  return [BAND_COLORS[Math.floor(digits / 10)], BAND_COLORS[digits % 10], BAND_COLORS[exp], GOLD]
}

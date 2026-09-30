export type PinRole = [text: string, color: string]

export function dipTopViewSvg(title: string, partNo: string, roles: Record<number, PinRole>, footer: string): string {
  let s = `<svg viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg"><text x="200" y="16" text-anchor="middle" fill="#ffb547" font-size="14" font-weight="700">${title}</text>`
  s += `<rect x="150" y="30" width="100" height="290" rx="8" fill="#1a2133" stroke="#e2e8f6" stroke-width="2"/><path d="M188,30 A12,12 0 0 0 212,30" fill="#0b0f17" stroke="#e2e8f6" stroke-width="2"/><circle cx="166" cy="50" r="4" fill="#e2e8f6"/>`
  s += `<text x="200" y="180" text-anchor="middle" fill="#8f9bb6" font-size="12" transform="rotate(-90 200 180)">${partNo}</text>`
  for (let i = 0; i < 7; i++) {
    const y = 58 + i * 40
    const l = i + 1
    const r = 14 - i
    s += `<rect x="132" y="${y - 7}" width="18" height="14" fill="#c9d3ea"/><rect x="250" y="${y - 7}" width="18" height="14" fill="#c9d3ea"/>`
    s += `<text x="160" y="${y + 4}" font-size="11" fill="#ffb547" font-weight="700">${l}</text><text x="240" y="${y + 4}" font-size="11" fill="#ffb547" font-weight="700" text-anchor="end">${r}</text>`
    s += `<text x="126" y="${y + 4}" font-size="11.5" text-anchor="end" fill="${roles[l][1]}">${roles[l][0]}</text><text x="274" y="${y + 4}" font-size="11.5" fill="${roles[r][1]}">${roles[r][0]}</text>`
  }
  return s + `<text x="200" y="336" text-anchor="middle" fill="#8f9bb6" font-size="11">${footer}</text></svg>`
}

export function to220Svg(title: string, names: string[], roles: string[], tabNote: string, tabColor: string): string {
  let s = `<svg viewBox="0 0 220 290" xmlns="http://www.w3.org/2000/svg"><text x="110" y="16" text-anchor="middle" fill="#ffb547" font-size="14" font-weight="700">${title}</text>`
  s += `<rect x="55" y="28" width="110" height="52" rx="4" fill="#8f98ab"/><circle cx="110" cy="52" r="10" fill="#0b0f17"/>`
  s += `<rect x="55" y="76" width="110" height="92" rx="4" fill="#1a2133" stroke="#e2e8f6" stroke-width="2"/><text x="110" y="126" text-anchor="middle" fill="#cbd5ea" font-size="14" font-weight="700">${title}</text>`
  ;[80, 110, 140].forEach((x, i) => {
    s += `<rect x="${x - 4}" y="168" width="8" height="62" fill="#c9d3ea"/><text x="${x}" y="248" text-anchor="middle" fill="#ffb547" font-size="13" font-weight="700">${i + 1}</text><text x="${x}" y="266" text-anchor="middle" fill="#e7ecf5" font-size="12" font-weight="700">${names[i]}</text><text x="${x}" y="282" text-anchor="middle" fill="#8f9bb6" font-size="9.5">${roles[i]}</text>`
  })
  return s + `<text x="110" y="100" text-anchor="middle" fill="${tabColor}" font-size="11" font-weight="700">${tabNote}</text></svg>`
}

export interface SchematicPanel {
  height: number
  num: string
  title: string
  sub: string
  draw: () => string
}

export function stackPanels(panels: SchematicPanel[], frame: (W: number, H: number, num: string, title: string, sub: string, inner: string) => string, width = 1080, gap = 18): { viewBox: string; svg: string } {
  let y = 0
  let svg = ''
  for (const p of panels) {
    svg += `<g transform="translate(0,${y})">${frame(width, p.height, p.num, p.title, p.sub, p.draw())}</g>`
    y += p.height + gap
  }
  return { viewBox: `0 0 ${width} ${Math.max(0, y - gap)}`, svg }
}

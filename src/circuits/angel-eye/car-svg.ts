const ring = (cx: number, label: string): string => {
  const dots = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2
    return `<circle cx="${(cx + Math.cos(a) * 42).toFixed(1)}" cy="${(160 + Math.sin(a) * 42).toFixed(1)}" r="4" fill="#eef5ff"/>`
  }).join('')
  return `<circle cx="${cx}" cy="160" r="42" fill="none" stroke="#eef5ff" stroke-width="9" opacity=".25"/>${dots}` +
    `<circle cx="${cx}" cy="160" r="22" fill="#1c2433" stroke="#566179" stroke-width="2"/>` +
    `<text x="${cx}" y="250" text-anchor="middle" fill="#cbd5ea" font-size="12">${label}</text>`
}

export function carSvg(): string {
  return `<svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI,Tahoma,Arial">
  <rect x="15" y="50" width="140" height="220" rx="14" fill="#141b2c" stroke="#3a4666" stroke-width="2"/>
  <text x="85" y="40" text-anchor="middle" fill="#ffb547" font-size="14" font-weight="700">سلك لمبة الركن</text>
  <text x="85" y="150" text-anchor="middle" fill="#8f9bb6" font-size="12">فرع من السلك</text><text x="85" y="168" text-anchor="middle" fill="#8f9bb6" font-size="12">(اللمبة الأصلية</text><text x="85" y="186" text-anchor="middle" fill="#8f9bb6" font-size="12">زي ما هي)</text>
  <rect x="290" y="50" width="160" height="220" rx="14" fill="#1a1508" stroke="#ffb547" stroke-width="2"/>
  <text x="370" y="40" text-anchor="middle" fill="#ffb547" font-size="14" font-weight="700">علبة الدايرة</text>
  <text x="370" y="158" text-anchor="middle" fill="#cbd5ea" font-size="13">TIP122 + 100µF</text>
  <text x="302" y="96" fill="#ff5d5d" font-size="12" font-weight="700">IN</text><text x="302" y="226" fill="#cfd7e8" font-size="12" font-weight="700">GND</text>
  <text x="438" y="96" fill="#ffd24d" font-size="12" font-weight="700" text-anchor="end">RING+</text><text x="438" y="226" fill="#5aa9ff" font-size="12" font-weight="700" text-anchor="end">RING−</text>
  <line x1="155" y1="90" x2="195" y2="90" stroke="#ff5d5d" stroke-width="4"/><rect x="195" y="80" width="46" height="20" rx="4" fill="#2a1414" stroke="#ff5d5d" stroke-width="2"/><text x="218" y="94" text-anchor="middle" fill="#ff9a9a" font-size="11" font-weight="700">1A</text><line x1="241" y1="90" x2="290" y2="90" stroke="#ff5d5d" stroke-width="4"/>
  <text x="222" y="72" text-anchor="middle" fill="#ff9a9a" font-size="11">أحمر ← فيوز</text>
  <line x1="155" y1="220" x2="290" y2="220" stroke="#cfd7e8" stroke-width="4"/><text x="222" y="246" text-anchor="middle" fill="#cfd7e8" font-size="11">أسود ← شاسيه</text>
  <path d="M450 90 H520 V112 M520 90 H660 V112" fill="none" stroke="#ffd24d" stroke-width="4"/>
  <path d="M450 220 H540 V208 M540 220 H680 V208" fill="none" stroke="#5aa9ff" stroke-width="4"/>
  ${ring(530, 'حلقة الفانوس اليمين')}
  ${ring(670, 'حلقة الفانوس الشمال')}
  <text x="600" y="300" text-anchor="middle" fill="#8f9bb6" font-size="11">الحلقتين على التوازي: + مع + و− مع −</text>
  </svg>`
}

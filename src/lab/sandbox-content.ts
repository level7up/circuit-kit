import { fmtR } from '../lib/format'
import { LED_MAX_A, RESISTOR_RATED_W, type LedColor, type SandboxKind, type SandboxPart, type SolveResult } from '../lib/sandbox/solver'

export const SUPPLIES = [0, 3, 5, 9, 12]
export const RESISTOR_VALUES = [100, 220, 330, 470, 680, 1000, 2200, 10000]
export const LED_COLORS: { key: LedColor; label: string }[] = [
  { key: 'red', label: 'أحمر' }, { key: 'yellow', label: 'أصفر' }, { key: 'green', label: 'أخضر' }, { key: 'blue', label: 'أزرق' }, { key: 'white', label: 'أبيض' }
]
export const colorName = (c: LedColor | undefined) => LED_COLORS.find(x => x.key === c)?.label ?? ''

export interface PaletteItem {
  kind: Exclude<SandboxKind, 'wire'>
  icon: string
  label: string
  hint: string
  defaults: Partial<SandboxPart>
}

export const PALETTE: PaletteItem[] = [
  { kind: 'res', icon: '〰️', label: 'مقاومة', hint: 'بتقلل التيار. رجليها في عمودين مختلفين.', defaults: { ohms: 330 } },
  { kind: 'led', icon: '💡', label: 'LED', hint: 'بينوّر لما التيار يعدي فيه من + لـ −. محتاج مقاومة!', defaults: { color: 'red' } },
  { kind: 'switch', icon: '🔘', label: 'مفتاح', hint: 'دوس عليه يفتح ويقفل الدايرة.', defaults: { closed: false } }
]

export const recommendedResistor = (supply: number) => RESISTOR_VALUES.find(r => (supply - 2) / r <= 0.015) ?? 10000

export interface LabMessage {
  st: 'ok' | 'warn' | 'bad' | 'info'
  text: string
}

const mA = (a: number) => (a * 1000).toFixed(1) + 'mA'

export function partLabels(parts: SandboxPart[]): Record<string, string> {
  const prefix: Record<SandboxKind, string> = { res: 'R', led: 'D', switch: 'S', wire: 'W' }
  const counts: Record<string, number> = {}
  return Object.fromEntries(parts.map(p => {
    counts[p.kind] = (counts[p.kind] ?? 0) + 1
    return [p.id, prefix[p.kind] + counts[p.kind]]
  }))
}

function ledMessage(p: SandboxPart, name: string, r: SolveResult, supply: number): LabMessage {
  const res = r.parts[p.id]
  const title = `${name} (LED ${colorName(p.color)})`
  switch (res?.ledState) {
    case 'on': return { st: 'ok', text: `✅ ${title} منوّر: بيعدّي فيه ${mA(res.current)}، يعني سطوعه حوالي ${Math.round((res.brightness ?? 0) * 100)}%.` }
    case 'burned': return { st: 'bad', text: `🔥 ${title} اتحرق: التيار كان ${mA(p.burnCurrent ?? res.current)} والـ LED بيستحمل ${mA(LED_MAX_A)} بس. حط مقاومة على التوالي معاه (${fmtR(recommendedResistor(supply))} مع ${supply}V)، وبعدين دوس عليه واختار "LED جديد".` }
    case 'reversed': return { st: 'warn', text: `↩️ ${title} متركب بالعكس: الرجل + (اللي عليها العلامة) لازم تبقى ناحية الموجب. دوس عليه واختار "اقلبه".` }
    case 'bypassed': return { st: 'warn', text: `⚠️ رجلين ${title} في نفس العمود، فالعمود واصلهم ببعض والتيار بيلف من حواليه.` }
    default: return { st: 'warn', text: `💤 ${title} مطفي: مفيش تيار بيعدّي فيه. اتأكد إن الـ + بتاعه واصل بالموجب والـ − واصل بالسالب، وإن الدايرة مقفولة (المفتاح ON).` }
  }
}

export function explain(parts: SandboxPart[], r: SolveResult, supply: number): LabMessage[] {
  if (!parts.length) return [{ st: 'info', text: '👆 اسحب قطعة من الصندوق اللي فوق وحطها على البورد، أو جرّب مثال جاهز.' }]
  const labels = partLabels(parts)
  const out: LabMessage[] = []
  if (!supply) out.push({ st: 'info', text: '⚡ المصدر مطفي. اختار جهد من فوق عشان الكهربا تمشي في الخطوط الحمرا (+) والزرقا (−).' })
  if (r.short) return [...out, { st: 'bad', text: '⛔ قصر! الموجب واصل بالسالب مباشرة من غير أي حاجة في النص. في الحقيقة البطارية هتسخن أو الأدابتر هيفصل. شيل السلك أو المفتاح اللي عامل القصر.' }]
  for (const p of parts) {
    const res = r.parts[p.id]
    if (p.kind === 'led' && supply) out.push(ledMessage(p, labels[p.id], r, supply))
    if (p.kind === 'res' && res?.bypassed) out.push({ st: 'warn', text: `⚠️ ${labels[p.id]} رجليها في نفس العمود، فهي ملهاش أي تأثير. حط كل رجل في عمود مختلف.` })
    if (p.kind === 'res' && res?.hot) out.push({ st: 'bad', text: `🌡️ ${labels[p.id]} بتسخن جداً: شايلة ${(res.current * res.current * (p.ohms ?? 0)).toFixed(2)} وات، وهي معمولة لـ ${RESISTOR_RATED_W} وات بس. استخدم قيمة أكبر.` })
  }
  if (supply && !out.some(m => m.st !== 'info')) out.push({ st: 'info', text: '🔌 الدايرة شغالة ومفيش مشاكل. دوس على أي خرم تقيس الجهد عليه.' })
  return out
}

export interface Example {
  key: string
  label: string
  supply: number
  parts: Omit<SandboxPart, 'id'>[]
}

export const EXAMPLES: Example[] = [
  {
    key: 'led', label: '💡 LED ومقاومة', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'res', a: 'b10', b: 'b14', ohms: 470 },
      { kind: 'led', a: 'c14', b: 'c15', color: 'red' },
      { kind: 'wire', a: 'a15', b: 'tn15' }
    ]
  },
  {
    key: 'switch', label: '🔘 LED ومفتاح', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'switch', a: 'b10', b: 'b12', closed: false },
      { kind: 'res', a: 'c12', b: 'c16', ohms: 470 },
      { kind: 'led', a: 'd16', b: 'd17', color: 'green' },
      { kind: 'wire', a: 'a17', b: 'tn17' }
    ]
  },
  {
    key: 'burn', label: '🔥 LED من غير مقاومة', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'led', a: 'b10', b: 'b11', color: 'yellow' },
      { kind: 'wire', a: 'a11', b: 'tn11' }
    ]
  }
]

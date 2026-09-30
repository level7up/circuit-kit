import { fmtR } from '../lib/format'
import { LED_MAX_A, MOTOR_START_A, NPN_BETA, RESISTOR_RATED_W, ldrOhms, type LedColor, type SandboxKind, type SandboxPart, type SolveResult } from '../lib/sandbox/solver'
import type { PlaceableKind } from '../lib/sandbox/placement'

export const SUPPLIES = [0, 3, 5, 9, 12]
export const RESISTOR_VALUES = [100, 220, 330, 470, 680, 1000, 2200, 10000]
export const LED_COLORS: { key: LedColor; label: string }[] = [
  { key: 'red', label: 'أحمر' }, { key: 'yellow', label: 'أصفر' }, { key: 'green', label: 'أخضر' }, { key: 'blue', label: 'أزرق' }, { key: 'white', label: 'أبيض' }
]
export const colorName = (c: LedColor | undefined) => LED_COLORS.find(x => x.key === c)?.label ?? ''

export const KIND_NAME: Record<SandboxKind, string> = {
  res: 'مقاومة', led: 'LED', wire: 'سلك', switch: 'مفتاح', button: 'زرار', diode: 'دايود',
  buzzer: 'بازر', bulb: 'لمبة 12V', motor: 'موتور', ldr: 'حساس ضوء LDR', pot: 'مقاومة متغيرة', npn: 'ترانزستور NPN'
}

export interface PaletteItem {
  kind: PlaceableKind
  icon: string
  label: string
  hint: string
  defaults: Partial<SandboxPart>
}

export interface PaletteGroup {
  title: string
  items: PaletteItem[]
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: 'أساسي',
    items: [
      { kind: 'res', icon: '〰️', label: 'مقاومة', hint: 'بتقلل التيار. رجليها في عمودين مختلفين.', defaults: { ohms: 330 } },
      { kind: 'led', icon: '💡', label: 'LED', hint: 'بينوّر لما التيار يعدي فيه من + لـ −. محتاج مقاومة!', defaults: { color: 'red' } },
      { kind: 'switch', icon: '🎚️', label: 'مفتاح', hint: 'دوس عليه يفتح ويقفل الدايرة.', defaults: { closed: false } },
      { kind: 'button', icon: '🔘', label: 'زرار', hint: 'بيوصّل بس طول ما انت دايس عليه.', defaults: { pressed: false } }
    ]
  },
  {
    title: 'تحكم',
    items: [
      { kind: 'pot', icon: '🎛️', label: 'مقاومة متغيرة', hint: '3 رجول: الطرفين والوسطانية. لفّ المفتاح تغيّر المقاومة.', defaults: { ohms: 10000, level: 0.5 } },
      { kind: 'ldr', icon: '🌗', label: 'حساس ضوء', hint: 'مقاومته بتقل كل ما النور يزيد.', defaults: { level: 0.5 } },
      { kind: 'npn', icon: '🔀', label: 'ترانزستور', hint: 'تيار صغير في القاعدة (B) بيتحكم في تيار كبير من C لـ E.', defaults: {} },
      { kind: 'diode', icon: '➡️', label: 'دايود', hint: 'بيعدّي التيار في اتجاه واحد بس. الشريطة = −.', defaults: {} }
    ]
  },
  {
    title: 'حِمل',
    items: [
      { kind: 'bulb', icon: '🔆', label: 'لمبة 12V', hint: 'لمبة فتلة صغيرة 1 وات. بتنوّر على الآخر عند 12V.', defaults: {} },
      { kind: 'buzzer', icon: '🔊', label: 'بازر', hint: 'بيزن لما يعدي فيه تيار كفاية. ليه + و −.', defaults: {} },
      { kind: 'motor', icon: '🌀', label: 'موتور', hint: 'بيلف، وكل ما التيار يزيد يلف أسرع.', defaults: {} }
    ]
  }
]

export const PALETTE: PaletteItem[] = PALETTE_GROUPS.flatMap(g => g.items)

export const recommendedResistor = (supply: number) => RESISTOR_VALUES.find(r => (supply - 2) / r <= 0.015) ?? 10000

export interface LabMessage {
  st: 'ok' | 'warn' | 'bad' | 'info'
  text: string
}

const mA = (a: number) => (a * 1000).toFixed(1) + 'mA'

export function partLabels(parts: SandboxPart[]): Record<string, string> {
  const prefix: Record<SandboxKind, string> = { res: 'R', led: 'LED', switch: 'S', wire: 'W', button: 'SW', diode: 'D', buzzer: 'BZ', bulb: 'L', motor: 'M', ldr: 'LDR', pot: 'VR', npn: 'Q' }
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

function otherMessage(p: SandboxPart, name: string, r: SolveResult): LabMessage | null {
  const res = r.parts[p.id]
  if (!res) return null
  const i = Math.abs(res.current)
  switch (p.kind) {
    case 'res':
      if (res.bypassed) return { st: 'warn', text: `⚠️ ${name} رجليها في نفس العمود، فهي ملهاش أي تأثير. حط كل رجل في عمود مختلف.` }
      return res.hot ? { st: 'bad', text: `🌡️ ${name} بتسخن جداً: شايلة ${(i * i * (p.ohms ?? 0)).toFixed(2)} وات، وهي معمولة لـ ${RESISTOR_RATED_W} وات بس. استخدم قيمة أكبر.` } : null
    case 'diode':
      if (res.junction === 'on') return { st: 'ok', text: `✅ ${name} (دايود) بيوصّل: ${mA(i)}، وبياكل حوالي 0.7V.` }
      if (res.junction === 'reversed') return { st: 'info', text: `🚫 ${name} (دايود) قافل: التيار عايز يعدي في الاتجاه العكسي. ده شغله: بيحمي الدايرة لو الأسلاك اتعكست. الشريطة لازم ناحية السالب.` }
      return res.junction === 'burned' ? { st: 'bad', text: `🔥 ${name} اتحرق: عدّى فيه أكتر من 1A.` } : null
    case 'buzzer':
      if (res.active) return { st: 'ok', text: `🔊 ${name} بيزن: ${mA(i)}.` }
      if (res.junction === 'reversed') return { st: 'warn', text: `↩️ ${name} متركب بالعكس. الرجل + ناحية الموجب.` }
      if (res.junction === 'burned') return { st: 'bad', text: `🔥 ${name} اتحرق من تيار كبير. حط مقاومة معاه.` }
      return { st: 'warn', text: `🔇 ${name} ساكت: التيار ${mA(i)} مش كفاية (محتاج 10mA على الأقل، يعني حوالي 3V وأكتر).` }
    case 'bulb': {
      const pct = Math.round((res.brightness ?? 0) * 100)
      return pct > 0 ? { st: 'ok', text: `🔆 ${name} منوّرة ${pct}%${pct < 90 ? '. معمولة على 12V، فمع جهد أقل بتنوّر أضعف بكتير' : ''}.` } : { st: 'warn', text: `💤 ${name} مطفية: مفيش تيار بيعدّي فيها.` }
    }
    case 'motor':
      return (res.speed ?? 0) > 0 ? { st: 'ok', text: `🌀 ${name} بيلف بسرعة ${Math.round((res.speed ?? 0) * 100)}% (${mA(i)}).` } : { st: 'warn', text: `⏸️ ${name} واقف: محتاج ${mA(MOTOR_START_A)} على الأقل عشان يبدأ يلف، ودلوقتي ${mA(i)}.` }
    case 'ldr':
      return { st: 'info', text: `🌗 ${name}: الإضاءة ${Math.round((p.level ?? 0.5) * 100)}%، فمقاومته دلوقتي ${fmtR(Math.round(ldrOhms(p.level)))}. زوّد النور تقل المقاومة.` }
    case 'pot':
      return res.hot ? { st: 'bad', text: `🌡️ ${name} بتسخن: لفّيتها لطرف قيمته صغيرة جداً والتيار كبير. حط مقاومة ثابتة معاها.` } : { st: 'info', text: `🎛️ ${name} ملفوفة ${Math.round((p.level ?? 0.5) * 100)}%.` }
    case 'npn':
      switch (res.transistor) {
        case 'saturated': return { st: 'ok', text: `🔀 ${name} فاتح على الآخر (زي مفتاح مقفول): تيار القاعدة ${mA(res.ib ?? 0)} بيعدّي ${mA(res.ic ?? 0)} من C لـ E.` }
        case 'active': return { st: 'ok', text: `🔀 ${name} بيكبّر: تيار القاعدة ${mA(res.ib ?? 0)} × ${NPN_BETA} = ${mA(res.ic ?? 0)} في الكولكتور.` }
        case 'burned': return { st: 'bad', text: `🔥 ${name} اتحرق: القاعدة (B) لازم تاخد تيارها من خلال مقاومة (10kΩ مثلاً)، مش سلك على طول.` }
        default: return { st: 'warn', text: `⛔ ${name} قافل: مفيش تيار داخل القاعدة (B)، فمفيش تيار بيعدّي من C لـ E. وصّل القاعدة بالموجب من خلال مقاومة.` }
      }
    default:
      return null
  }
}

export function explain(parts: SandboxPart[], r: SolveResult, supply: number): LabMessage[] {
  if (!parts.length) return [{ st: 'info', text: '👆 اسحب قطعة من الصندوق اللي فوق وحطها على البورد، أو جرّب مثال جاهز.' }]
  const labels = partLabels(parts)
  const out: LabMessage[] = []
  if (!supply) out.push({ st: 'info', text: '⚡ المصدر مطفي. اختار جهد من فوق عشان الكهربا تمشي في الخطوط الحمرا (+) والزرقا (−).' })
  if (r.short) return [...out, { st: 'bad', text: '⛔ قصر! الموجب واصل بالسالب مباشرة من غير أي حاجة في النص. في الحقيقة البطارية هتسخن أو الأدابتر هيفصل. شيل السلك أو المفتاح اللي عامل القصر.' }]
  if (!supply) return out
  for (const p of parts) {
    const m = p.kind === 'led' ? ledMessage(p, labels[p.id], r, supply) : otherMessage(p, labels[p.id], r)
    if (m) out.push(m)
  }
  if (!out.some(m => m.st !== 'info')) out.push({ st: 'info', text: '🔌 الدايرة شغالة ومفيش مشاكل. دوس على أي خرم تقيس الجهد عليه.' })
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
  },
  {
    key: 'pot', label: '🎛️ LED بيتحكم فيه بمفتاح لف', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'pot', a: 'b10', c: 'b11', b: 'b12', ohms: 10000, level: 0.8 },
      { kind: 'res', a: 'c11', b: 'c15', ohms: 220 },
      { kind: 'led', a: 'd15', b: 'd16', color: 'blue' },
      { kind: 'wire', a: 'a16', b: 'tn16' }
    ]
  },
  {
    key: 'npn', label: '🔀 ترانزستور بيشغّل لمبة بزرار', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'bulb', a: 'b10', b: 'b13' },
      { kind: 'npn', a: 'c13', c: 'c14', b: 'c15' },
      { kind: 'wire', a: 'a15', b: 'tn15' },
      { kind: 'wire', a: 'tp20', b: 'a20' },
      { kind: 'button', a: 'b20', b: 'b22', pressed: false },
      { kind: 'res', a: 'c22', b: 'c26', ohms: 1000 },
      { kind: 'wire', a: 'd26', b: 'd14' }
    ]
  },
  {
    key: 'ldr', label: '🌙 LED بينوّر في الضلمة', supply: 9,
    parts: [
      { kind: 'wire', a: 'tp10', b: 'a10' },
      { kind: 'res', a: 'b10', b: 'b14', ohms: 10000 },
      { kind: 'ldr', a: 'c14', b: 'c16', level: 0.8 },
      { kind: 'wire', a: 'a16', b: 'tn16' },
      { kind: 'npn', a: 'd13', c: 'd14', b: 'd15' },
      { kind: 'wire', a: 'a15', b: 'tn15' },
      { kind: 'wire', a: 'tp8', b: 'a8' },
      { kind: 'res', a: 'c8', b: 'c12', ohms: 470 },
      { kind: 'led', a: 'e12', b: 'e13', color: 'white' }
    ]
  }
]

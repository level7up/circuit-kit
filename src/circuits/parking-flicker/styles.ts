import type { PresetPart, SimPreset } from '../../types/circuit'
import { defaults, type FlickerParams } from './simulate'

interface StyleValues {
  R: [number, number, number]
  Cn: number
  Rf?: number
}

const floorOf = (v: StyleValues) => v.Rf ?? defaults.Rf
const sameValues = (p: FlickerParams, v: StyleValues) => p.Cn === v.Cn && p.Rf === floorOf(v) && v.R.every((r, i) => p.R[i] === r)

const style = (id: string, icon: string, name: string, desc: string, values: StyleValues, parts: PresetPart[]): SimPreset<FlickerParams> => ({
  id, icon, name, desc, parts,
  apply: p => ({ ...p, R: [...values.R], Cn: values.Cn, Rf: floorOf(values) }),
  isActive: p => sameValues(p, values)
})

export const flickerStyles: SimPreset<FlickerParams>[] = [
  style('candle', '🕯️', 'شمعة', 'التصميم الأصلي: تمايل هادي مع رجفة خفيفة، زي لهب شمعة في أوضة.',
    { R: [defaults.R[0], defaults.R[1], defaults.R[2]], Cn: defaults.Cn },
    [
      { id: 'R1', value: '1MΩ', buy: false },
      { id: 'R2', value: '390kΩ', buy: false },
      { id: 'R3', value: '100kΩ', buy: false },
      { id: 'C8', value: '22µF', buy: false }
    ]),
  style('fire', '🔥', 'نار', 'أسرع وأنشط من الشمعة بمرتين تقريباً، زي نار في دفاية أو شعلة في الهوا.',
    { R: [470e3, 220e3, 47e3], Cn: 10e-6 },
    [
      { id: 'R1', value: '470kΩ', buy: true },
      { id: 'R2', value: '220kΩ', buy: true },
      { id: 'R3', value: '47kΩ', buy: true, note: 'نفس قيمة R6، بس محتاج واحدة زيادة' },
      { id: 'C8', value: '10µF', buy: true, note: '16V أو أكتر' }
    ]),
  style('tv', '📺', 'تلفزيون قديم', 'رعشة سريعة ومتقطعة زي شاشة قديمة أو لمبة نيون بايظة. ملفتة جداً، فبلاش منها والعربية ماشية.',
    { R: [220e3, 47e3, 10e3], Cn: 1e-6 },
    [
      { id: 'R1', value: '220kΩ', buy: true },
      { id: 'R2', value: '47kΩ', buy: true, note: 'نفس قيمة R6، بس محتاج واحدة زيادة' },
      { id: 'R3', value: '10kΩ', buy: true, note: 'نفس قيمة R4 وR7، بس محتاج واحدة زيادة' },
      { id: 'C8', value: '1µF', buy: true, note: 'نفس C4 وC5 وC6، بس محتاج واحد زيادة' }
    ]),
  style('breath', '🌬️', 'تنفّس', 'بطيء وناعم: النور بيعلى ويوطى بهدوء حوالي مرة في الثانية، من غير رجفة.',
    { R: [3.3e6, 2.2e6, 1e6], Cn: 47e-6 },
    [
      { id: 'R1', value: '3.3MΩ', buy: true },
      { id: 'R2', value: '2.2MΩ', buy: true },
      { id: 'R3', value: '1MΩ', buy: true, note: 'نفس قيمة R1 الأصلية، بس محتاج واحدة زيادة' },
      { id: 'C8', value: '47µF', buy: true, note: '16V أو أكتر' }
    ]),
  style('hard', '⚡', 'رعشة حادة', 'سريعة وحادة مش ناعمة: النور بيقطع ويرجع حوالي 25 مرة في الثانية، وبيطفي لحظات قصيرة. ملفتة جداً، فاستخدمها والعربية راكنة بس.',
    { R: [100e3, 47e3, 22e3], Cn: 0.1e-6, Rf: 22e3 },
    [
      { id: 'R1', value: '100kΩ', buy: true, note: 'نفس قيمة R3 الأصلية، بس محتاج واحدة زيادة' },
      { id: 'R2', value: '47kΩ', buy: true, note: 'نفس قيمة R6، بس محتاج واحدة زيادة' },
      { id: 'R3', value: '22kΩ', buy: true, note: 'نفس قيمة R5، بس محتاج واحدة زيادة' },
      { id: 'C8', value: '100nF', buy: true, note: 'المكثف الصغير 104، زي C2 وC3 وC7' },
      { id: 'R7', value: '22kΩ', buy: true, note: 'بدل الـ 10kΩ: ده اللي بيخلّي النور يوصل للضلمة في اللحظات الواطية' }
    ])
]

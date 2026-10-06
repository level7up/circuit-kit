import type { SimPreset } from '../../types/circuit'
import { fmtR } from '../../lib/format'
import { defaults, type ChaseParams } from './simulate'

const speed = (id: string, icon: string, name: string, desc: string, R: number): SimPreset<ChaseParams> => ({
  id,
  icon,
  name,
  desc,
  apply: p => ({ ...p, R, C: defaults.C }),
  isActive: p => p.R === R && p.C === defaults.C,
  parts: [
    { id: 'R1', value: fmtR(R), buy: R !== defaults.R, note: R !== defaults.R ? 'مكان الـ 100k' : undefined },
    { id: 'C4', value: '1µF', buy: false }
  ]
})

export const speedStyles: SimPreset<ChaseParams>[] = [
  speed('fast', '🏃', 'سريع جداً', 'حوالي 38 ms لكل خطوة: النور بيجري زي البرق.', 47e3),
  speed('theater', '🎭', 'مسرح', 'حوالي 80 ms لكل خطوة: زي لمبات السينما القديمة. ده الأصلي.', 100e3),
  speed('calm', '🚶', 'هادي', 'حوالي 180 ms لكل خطوة: جري هادي ومريح للعين.', 220e3),
  speed('slow', '🐢', 'بطيء', 'حوالي 320 ms لكل خطوة: تقدر تعدّ الخطوات بعينك.', 390e3)
]

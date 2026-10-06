import type { SimPreset } from '../../types/circuit'
import { fmtC } from '../../lib/format'
import { defaults, type AngelParams } from './simulate'

interface FadeValues {
  fade: number
  Cf: number
}

const isStandard = (p: AngelParams) => p.Rf === defaults.Rf && p.Rb === defaults.Rb

const fadeStyle = (id: string, icon: string, name: string, desc: string, v: FadeValues, buy: boolean): SimPreset<AngelParams> => ({
  id,
  icon,
  name,
  desc,
  apply: p => ({ ...p, fade: v.fade, Cf: v.Cf, Rf: defaults.Rf, Rb: defaults.Rb }),
  isActive: p => p.fade === v.fade && (!v.fade || (p.Cf === v.Cf && isStandard(p))),
  parts: v.fade
    ? [
        { id: 'C2', value: fmtC(v.Cf), buy, note: buy ? 'مكان الـ 100µF' : undefined },
        { id: 'R1', value: '10kΩ', buy: false },
        { id: 'R2', value: '22kΩ', buy: false },
        { id: 'Q1', value: 'TIP122', buy: false }
      ]
    : [
        { id: 'D1', value: '1N4007', buy: false },
        { id: 'D2', value: 'P6KE18A', buy: false },
        { id: 'C1', value: '100nF', buy: false },
        { id: 'Q1', value: 'مش محتاجه', buy: false }
      ]
})

export const fadeStyles: SimPreset<AngelParams>[] = [
  fadeStyle('instant', '⚡', 'فوري', 'الحلقة بتولّع مرة واحدة. أبسط حاجة: الحماية بس (D1 وD2 وC1)، والحلقة على +12V والأرضي على طول من غير ترانزستور.', { fade: 0, Cf: defaults.Cf }, false),
  fadeStyle('quick', '🌤️', 'فيد سريع', 'نص ثانية تقريباً: الحلقة بتولّع بنعومة بس من غير ما تستنى.', { fade: 1, Cf: 47e-6 }, true),
  fadeStyle('classic', '✨', 'فيد كلاسيك', 'حوالي ثانية: زي العربيات الألماني. ده التصميم الأصلي بالقطع اللي في الكيت.', { fade: 1, Cf: 100e-6 }, false),
  fadeStyle('slow', '🌅', 'فيد بطيء', 'حوالي ثانيتين: صحيان هادي. حلو والعربية راكنة.', { fade: 1, Cf: 220e-6 }, true)
]

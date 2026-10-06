import type { SimPreset } from '../../types/circuit'
import { OLD_TV, STEADY, type AngelParams } from './simulate'

const style = (id: string, icon: string, name: string, desc: string, value: number, parts: SimPreset<AngelParams>['parts']): SimPreset<AngelParams> => ({
  id,
  icon,
  name,
  desc,
  apply: p => ({ ...p, style: value }),
  isActive: p => p.style === value,
  parts
})

export const lightStyles: SimPreset<AngelParams>[] = [
  style('steady', '⭕', 'ثابت', 'تولّع الركن الحلقتين ينوّروا، تطفيه يطفوا. على بورد الحماية الصغير بس.', STEADY, [
    { id: 'D1', value: '1N4007', buy: false },
    { id: 'D2', value: 'P6KE18A', buy: false },
    { id: 'C1', value: '100nF', buy: false },
    { id: 'البورد', value: '10 × 5', buy: false }
  ]),
  style('tv', '📺', 'تلفزيون قديم', 'الحلقتين بيرعشوا رعشة سريعة ومتقطعة زي شاشة قديمة. وصّلهم على دايرة الرعشة (الأصفر والأزرق) بدل بورد الحماية، بقيم التلفزيون القديم. ملفتة جداً: استخدمها والعربية راكنة بس.', OLD_TV, [
    { id: 'R1', value: '220kΩ', buy: true, note: 'في دايرة الرعشة' },
    { id: 'R2', value: '47kΩ', buy: true, note: 'في دايرة الرعشة' },
    { id: 'R3', value: '10kΩ', buy: true, note: 'في دايرة الرعشة' },
    { id: 'C8', value: '1µF', buy: true, note: 'في دايرة الرعشة' },
    { id: 'R8 R9 R10', value: '3 × 33Ω', buy: true, note: 'بدل 3 × 68Ω عشان تشيل الحلقتين' }
  ])
]

import type { BoardRemoval, RemovalEffect } from '../../types/circuit'
import type { FlickerParams } from './simulate'

const OPEN = 1e12
const NO_SMOOTHING = 1e-9
const UNREGULATED_OUTPUT = 10.5
const STUCK_HIGH = 1
const STUCK_AVERAGE = 0.5

const bad = (r: string): RemovalEffect => ({ st: 'bad', r })
const warn = (r: string): RemovalEffect => ({ st: 'warn', r })

const oscNames = ['البطيئة', 'المتوسطة', 'السريعة']
const oscLoss = ['التمايل الكبير اختفى', 'الحركة المتوسطة اختفت', 'الرجفة السريعة اختفت']

const effects: Record<string, RemovalEffect> = {
  VIN: bad('مفيش كهربا خالص، فكل حاجة طفيت.'),
  F1: bad('مكان الفيوز فاضي، فالطريق مقطوع ومفيش كهربا. (لو حطيت سلك مكانه هتشتغل، بس من غير حماية.)'),
  WGND: bad('مفيش أرضي، فالكهربا مش لاقية طريق ترجع بيه. كل حاجة طفيت.'),
  D1: bad('الكهربا كانت بتعدي من الدايود، فمن غيره الطريق اتقطع وكل حاجة طفيت.'),
  J1: bad('خط +12V اللي تحت فضي من الكهربا، فكل حاجة طفيت.'),
  D2: warn('على المكتب مفيش فرق. في العربية الدايرة بقت من غير حماية من خبطات الدينامو والمارش.'),
  C1: warn('مفيش فرق يتشاف على المكتب. في العربية الـ 7805 ممكن يتلخبط من تذبذب الكهربا.'),
  U2: bad('مفيش 5V، فالشريحة مش شغالة والنقطة N صفر. اللمبة مطفية.'),
  C2: warn('غالباً مش هتلاحظ فرق، بس الـ 7805 ممكن يذبذب ويطلّع تشويش.'),
  C3: warn('غالباً مش هتلاحظ فرق، بس الـ 7805 ممكن يذبذب ويطلّع تشويش.'),
  J2: bad('الـ 7805 مش واصله كهربا، فمفيش 5V واللمبة مطفية.'),
  J3: bad('الـ 7805 من غير أرضي بيطلّع جهد أعلى بكتير من 5V (حوالي 10V، رقم تقريبي). الشريحة لسه عايشة لأنها بتستحمل لحد 18V، بس اللمبة بقت منوّرة على الآخر معظم الوقت والرعشة باظت.'),
  J4: bad('الـ 5V مش واصلة للخط اللي فوق، فالشريحة وR7 من غير كهربا. اللمبة مطفية.'),
  J5: bad('الأرضي اللي فوق اتفصل عن اللي تحت: R8 وR9 بقوا من غير أرضي، فمفيش تيار في اللمبة. ودخول الشريحة 9 و11 و13 بقت سايبة كمان.'),
  U1: bad('R4 وR5 وR6 بقوا مش واصلين بحاجة، فـ R7 لوحدها شادّة N لـ 5V. اللمبة منوّرة ثابت على الآخر ومفيش رعشة.'),
  J6: bad('الشريحة من غير كهربا، فالتلات ساعات وقفت. اللمبة منوّرة ثابت وضعيفة.'),
  C7: warn('غالباً هتشتغل، بس التشويش ممكن يلخبط الساعات وتلاقي رعشة غريبة.'),
  J7: warn('دخل بوابة مش مستخدمة بقى سايب، وC7 كمان فقد الأرضي بتاعه. الرعشة لسه شغالة، بس الشريحة ممكن تسخن أو تتصرف بغرابة.'),
  J8: warn('دخل بوابة مش مستخدمة بقى سايب. الرعشة لسه شغالة، بس الشريحة ممكن تسخن أو تسحب تيار زيادة. وصّله بالأرضي.'),
  J9: warn('دخل بوابة مش مستخدمة بقى سايب. الرعشة لسه شغالة، بس الشريحة ممكن تسخن أو تسحب تيار زيادة. وصّله بالأرضي.'),
  J10: bad('الشريحة من غير أرضي، فالساعات وقفت. اللمبة منوّرة ثابت وضعيفة.'),
  C8: warn('مفيش تنعيم: النور بقى بينط من مستوى لمستوى فجأة بدل ما يطلع وينزل بهدوء زي الشمعة.'),
  JN: bad('قاعدة الترانزستور مش واصلة بالموجات، وR7 لوحدها شادّاها لفوق. اللمبة منوّرة ثابت على الآخر.'),
  R7: warn('مفيش حاجة شادّة النقطة N لفوق، فاللمبة بتطفي خالص كل شوية.'),
  J11: warn('R7 مش واصلها 5V، فمفيش حاجة شادّة N لفوق واللمبة بتطفي خالص كل شوية.'),
  Q1: bad('مفيش حاجة بتتحكم في تيار اللمبة، والطريق مقطوع. اللمبة مطفية.'),
  R8: warn('R9 لوحدها شايلة التيار: التيار نزل للنص تقريباً واللمبة أضعف، والمقاومة بتسخن أكتر. لو شلت الاتنين اللمبة هتطفي.'),
  R9: warn('R8 لوحدها شايلة التيار: التيار نزل للنص تقريباً واللمبة أضعف، والمقاومة بتسخن أكتر. لو شلت الاتنين اللمبة هتطفي.'),
  J12: bad('R8 وR9 من غير أرضي، فمفيش تيار في اللمبة. مطفية.'),
  WLN: bad('سالب اللمبة مش واصل بالترانزستور، فاللمبة مطفية.'),
  WLP: bad('موجب اللمبة مش واصله كهربا، فاللمبة مطفية.'),
  LAMP: bad('مفيش لمبة، فمفيش نور. الدايرة نفسها لسه شغالة: تتبّع النقطة N وهتلاقي الجهد بيتحرك.'),
  LED: bad('مفيش LED، فمفيش نور. الدايرة نفسها لسه شغالة: تتبّع النقطة N وهتلاقي الجهد بيتحرك.'),
  RT: bad('المقاومة كانت في طريق الـ LED، فلما شلتها الطريق اتقطع والـ LED طفى. (لو حطيت سلك مكانها، الـ LED هيتحرق.)')
}

for (const i of [0, 1, 2]) {
  const n = i + 1
  effects['R' + n] = warn(`الساعة ${oscNames[i]} وقفت (مفيش مقاومة ترجّع الإشارة)، وخرجها ثابت على 5V. ${oscLoss[i]}.`)
  effects['C' + (n + 3)] = warn(`من غير المكثف الساعة ${oscNames[i]} بقت سريعة جداً (آلاف المرات في الثانية)، فالعين مش شايفاها و${oscLoss[i]}.`)
  effects['J' + 'ABC'[i]] = warn(`موجة الساعة ${oscNames[i]} مش واصلة للنقطة N، فـ${oscLoss[i]}.`)
  effects['R' + (n + 3)] = warn(`موجة الساعة ${oscNames[i]} مش واصلة للنقطة N، فـ${oscLoss[i]}.`)
}

const setAt = <T>(arr: T[], i: number, v: T): T[] => arr.map((x, j) => (j === i ? v : x))

function emitterPath(p: FlickerParams, has: (id: string) => boolean): Partial<FlickerParams> {
  if (p.single) return has('R8') ? { qDead: true } : {}
  const missing = ['R8', 'R9'].filter(has).length
  if (missing === 2) return { qDead: true }
  return missing === 1 ? { Re: p.Re * 2 } : {}
}

function oscillators(p: FlickerParams, has: (id: string) => boolean): Partial<FlickerParams> {
  return [0, 1, 2].reduce<Partial<FlickerParams>>((acc, i) => {
    const n = i + 1
    const stuck = acc.stuck ?? p.stuck
    const Rm = acc.Rm ?? p.Rm
    return {
      ...acc,
      stuck: has('R' + n) ? setAt(stuck, i, STUCK_HIGH) : has('C' + (n + 3)) ? setAt(stuck, i, STUCK_AVERAGE) : stuck,
      Rm: has('J' + 'ABC'[i]) || has('R' + (n + 3)) ? setAt(Rm, i, OPEN) : Rm
    }
  }, {})
}

function apply(p: FlickerParams, removed: Set<string>): FlickerParams {
  if (!removed.size) return p
  const has = (id: string) => removed.has(id)
  const any = (...ids: string[]) => ids.some(has)
  const led = p.lampMode === 'led'
  const lampGone = any('Q1', 'J12', 'J5', 'WLN', 'WLP') || (led ? any('LED', 'RT') : has('LAMP'))
  const chipGone = has('U1') || has('JN')
  let q: FlickerParams = { ...p, ...oscillators(p, has), ...emitterPath(p, has) }
  if (any('VIN', 'F1', 'WGND', 'D1', 'J1')) q = { ...q, Vin: 0 }
  if (any('U2', 'J2', 'J4')) q = { ...q, V5: 0 }
  else if (has('J3')) q = { ...q, V5: UNREGULATED_OUTPUT }
  if (chipGone) q = { ...q, Rm: [OPEN, OPEN, OPEN] }
  if (has('U1') || any('J6', 'J10')) q = { ...q, frozen: true }
  if (has('C8') || has('JN')) q = { ...q, Cn: NO_SMOOTHING }
  if (any('R7', 'J11')) q = { ...q, Rf: 0 }
  if (has('D2')) q = { ...q, noTvs: true }
  if (lampGone) q = { ...q, qDead: true }
  return q
}

export const removal: BoardRemoval<FlickerParams> = { effects, apply }

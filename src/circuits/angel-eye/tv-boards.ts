import type { AssemblyBoard, AssemblyPhase, PerfLayout, PerfPart } from '../../types/circuit'
import { assembly as flickerAssembly } from '../parking-flicker/assembly'

export const TV_VALUES: Record<string, { val: string; ohm?: number }> = {
  R1: { val: '220kΩ', ohm: 220e3 },
  R2: { val: '47kΩ', ohm: 47e3 },
  R3: { val: '10kΩ', ohm: 10e3 },
  C8: { val: '1µF' }
}

const TEXT_SWAPS: [RegExp, string][] = [
  [/1MΩ/g, '220kΩ'],
  [/390kΩ/g, '47kΩ'],
  [/100kΩ/g, '10kΩ'],
  [/22µF/g, '1µF'],
  [/R1 1M\b/g, 'R1 220k'],
  [/R2 390k\b/g, 'R2 47k'],
  [/R3 100k\b/g, 'R3 10k'],
  [/LAMP([+−])/g, 'RING$1'],
  [/الشريط الـ 20 لمبة/g, 'الحلقتين'],
  [/الشريط/g, 'الحلقتين'],
  [/بيرعش زي الشمعة/g, 'بيرعشوا زي التلفزيون القديم']
]

export const toTv = (text: string): string => TEXT_SWAPS.reduce((t, [from, to]) => t.replace(from, to), text)

const tvPart = (p: PerfPart): PerfPart => ({
  ...p,
  ...(TV_VALUES[p.id] ?? {}),
  lab: toTv(p.lab),
  val: TV_VALUES[p.id]?.val ?? toTv(p.val),
  tip: toTv(p.tip)
})

const lastStage = (layout: PerfLayout): number => Math.max(...layout.parts.map(p => p.s))

const buttonPads = (s: number): PerfPart[] => [
  { id: 'BTN1', k: 'pad', s, legs: [[21, 8]], nets: ['C'], lab: 'سويتش', val: 'سلك لنص السويتش', color: '#9aa6bd', face: 'down', optional: true,
    tip: 'اختياري: سلك من الرجل اللي في النص في السويتش، في ⟦V9⟧ على نفس خط الأزرق (RING−).' },
  { id: 'BTN2', k: 'pad', s, legs: [[21, 1]], nets: ['GND'], lab: 'سويتش', val: 'سلك لطرفين السويتش', color: '#2b2b2b', face: 'up', optional: true,
    tip: 'اختياري: سلك من الرجلين اللي على طرفين السويتش (موصّلين ببعض)، في ⟦V2⟧ على خط الأرضي.' }
]

const buttonPhase = (s: number): AssemblyPhase => ({
  s,
  t: 'اختياري: سلكين سويتش رعشة / ثابت',
  m: '⏱ 10 دقايق · سويتش KCD4 + سلكين',
  b: '<ol><li>السويتش <b>KCD4</b> فيه صفين رجول: استخدم <b>صف واحد</b>.</li><li>سلك من الرجل <b>اللي في النص</b> في <b>⟦V9⟧</b>: على نفس خط الأزرق (RING−).</li><li>وصّل الرجلين <b>اللي على الطرفين</b> ببعض، وسلك منهم في <b>⟦V2⟧</b>: على خط الأرضي.</li><li>السويتش نفسه في الطبلون جنبك (فتحة 25.5 × 21 مم).</li></ol>',
  c: ['نص السويتش في ⟦V9⟧', 'طرفين السويتش في ⟦V2⟧', 'صف واحد بس من رجول السويتش'],
  x: 'ولّع الركن: السويتش في النص = الحلقتين <b>بيرعشوا</b>، ناحية I = <b>ثابتين</b>. وبالصفارة والسويتش على I: ⟦V9⟧ مع ⟦V2⟧ <b>يصفّر</b>، وفي النص <b>ميصفرش</b>.'
})

const tvLayout = (layout: PerfLayout): PerfLayout => ({
  ...layout,
  parts: [...layout.parts.map(tvPart), ...buttonPads(lastStage(layout) + 2)]
})

const tvPhase = (phase: AssemblyPhase): AssemblyPhase => ({
  ...phase,
  t: toTv(phase.t),
  m: toTv(phase.m),
  b: toTv(phase.b),
  c: phase.c.map(toTv),
  x: toTv(phase.x)
})

const TV_BOARDS: Record<string, string> = { dot37: 'tv-dot', vero37: 'tv-vero' }

export const tvBoards: AssemblyBoard[] = flickerAssembly.boards
  .filter(b => TV_BOARDS[b.id])
  .map(b => ({
    id: TV_BOARDS[b.id],
    label: '📺 ' + b.label,
    layout: tvLayout(b.layout),
    note: toTv(b.note),
    phases: [...b.phases.map(tvPhase), buttonPhase(lastStage(b.layout) + 2)]
  }))

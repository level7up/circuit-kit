import type { BoardDef, BoardDynamics } from '../../types/circuit'
import { fmtC, fmtR } from '../../lib/format'
import { alternatives, edu, eduOf } from './edu'
import { labels, netChips, nets, parts, railNames, railNets, stages, wireColors, wireNames } from './board-parts'
import { basics } from './content'
import { partInfo } from './info'
import { removal } from './removal'
import type { FlickerParams } from './simulate'

const OHM_OF: Record<string, (p: FlickerParams) => number> = {
  R1: p => p.R[0], R2: p => p.R[1], R3: p => p.R[2],
  R4: p => p.Rm[0], R5: p => p.Rm[1], R6: p => p.Rm[2],
  R7: p => p.Rf,
  R8: p => p.emitter[0],
  R9: p => p.emitter[1],
  R10: p => p.emitter[2],
  RT: p => p.Rled
}

const CAP_OF: Record<string, (p: FlickerParams) => number> = {
  C4: p => p.Ct[0], C5: p => p.Ct[1], C6: p => p.Ct[2], C8: p => p.Cn
}

const PART_TEXT: Record<string, (p: FlickerParams) => string> = {
  F1: p => p.fuse,
  LAMP: p => p.lampName,
  LED: p => (p.ledDead ? '🔥 اتحرق' : p.ledRev ? '↩ مقلوب' : p.ledName)
}

const LED_STAGE = 6
const MAX_DRAWN_EMITTER = 3
const isBundle = (p: FlickerParams) => p.emitter.length > MAX_DRAWN_EMITTER

function labelText(id: string, base: string, p: FlickerParams): string {
  if (id === 'R8' && isBundle(p)) return `R8 حزمة ${p.emitter.length}×${fmtR(p.emitter[0])}`
  return OHM_OF[id] && base.includes(' ') ? `${id} ${fmtR(OHM_OF[id](p))}` : base
}

const dynamics: BoardDynamics<FlickerParams> = {
  hidden: p => new Set([
    ...(p.Rf ? [] : ['R7', 'J11']),
    ...(p.noTvs ? ['D2'] : []),
    ...(p.emitter.length < 2 || isBundle(p) ? ['R9'] : []),
    ...(p.emitter.length < 3 || isBundle(p) ? ['R10'] : [])
  ]),
  ohm: (id, p) => OHM_OF[id]?.(p),
  labelText,
  labelSub: (id, base, p) => (CAP_OF[id] ? fmtC(CAP_OF[id](p)) : base),
  partText: (id, p) => PART_TEXT[id]?.(p),
  lampMode: p => p.lampMode,
  withLampMode: (p, mode) => ({ ...p, lampMode: mode === 'led' ? 'led' : 't10' }),
  lampModeForStage: stage => (stage === LED_STAGE ? 'led' : 't10'),
  glowColor: p => (p.lampMode === 'led' ? p.ledGlow : p.lampGlow),
  partVariant: (id, p) => (id === 'LED' ? `${p.ledShape}:${p.ledLens}` : undefined),
  partDead: p => p.ledDead
}

export const board: BoardDef<FlickerParams> = {
  title: 'الدايرة على البريد بورد زي الحقيقة',
  sub: 'نفس الدايرة بالظبط، بس بالشكل اللي هيبقى قدامك على المكتب: كل قطعة في الخرم بتاعها. دوس على أي قطعة تعرف هي إيه ورجلها فين، أو على أي خرم تشوف كل اللي متوصل بيه.',
  viewBox: '4 36 1432 442',
  readingGuide: '📖 <b>إزاي تقرا البريد بورد:</b> كل عمود فيه 5 خرم (a لـ e) متوصلين ببعض من جوه، ونفس الكلام في (f لـ j). المجرى اللي في النص بيفصل النصين عن بعض، وعشان كده الـ IC بتركب عليه. الخطوط الطويلة فوق وتحت كل خط منهم متوصل على طوله: <b style="color:#fb923c">+5V</b> و<b style="color:#94a3b8">أرضي</b> فوق، و<b style="color:#94a3b8">أرضي</b> و<b style="color:#f87171">+12V</b> تحت.',
  jumperHint: 'السلك ملوش اتجاه، بس خلّي الألوان ثابتة: الأحمر +12V، والبرتقاني +5V، والأسود أرضي. ده بيسهّل عليك تتبّع أي عطل.',
  parts,
  stages,
  labels,
  nets,
  netChips,
  wireColors,
  wireNames,
  railNames,
  railNets,
  partInfo,
  edu,
  eduOf,
  eduFallback: 'wire',
  alternatives,
  basics,
  lampModes: [
    { key: 't10', switchLabel: '🚘 بدّل للشريط' },
    { key: 'led', switchLabel: '🧪 بدّل لـ LED التجربة + 470Ω' }
  ],
  dynamics,
  removal
}

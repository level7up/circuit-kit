<script setup lang="ts">
import { computed } from 'vue'
import type { AssemblyPhase, PerfLayout } from '../types/circuit'
import type { BuildItem } from '../lib/perfboard/build-items'
import { holeName as nameOf, holeText, partThumbnail, type LettersFrom } from '../lib/perfboard/draw'

const props = defineProps<{ layout: PerfLayout; phases: AssemblyPhase[]; lettersFrom: LettersFrom }>()
const emit = defineEmits<{ show: [item: BuildItem] }>()

interface Row {
  key: string
  item: BuildItem
  thumb: { viewBox: string; svg: string } | null
  icon: string
  name: string
  value: string
  where: string[]
  net: string
  netColor: string
  note: string
  phase: number
}

const KIND_NAME: Record<string, string> = {
  res: 'مقاومة', resUp: 'مقاومة واقفة', diode: 'دايود', tvs: 'دايود حماية', ceramic: 'مكثف صغير',
  can: 'مكثف كيميائي', to220: 'ترانزستور / منظّم', to92: 'ترانزستور صغير', dip: 'IC', pad: 'سلك خارج', wire: 'سلكة معزولة من فوق'
}

const phaseOf = (s: number) => props.phases.findIndex(p => p.s === s) + 1
const holeName = (l: PerfLayout, h: [number, number]) => nameOf(l, h, props.lettersFrom)
const netName = (n: string) => props.layout.nets[n]?.n ?? 'مش متوصلة'

const partRows = (layout: PerfLayout): Row[] => layout.parts.map(p => {
  const holes = p.legs.map(h => holeName(layout, h))
  const where = p.k === 'dip'
    ? [1, holes.length / 2, holes.length / 2 + 1, holes.length].map(n => 'رجل ' + n + ': ' + holes[n - 1])
    : holes.map((hole, i) => hole + ' (' + netName(p.nets[i]) + ')')
  const isLead = p.k === 'wire'
  return {
    key: 'part:' + p.id,
    item: { kind: 'part', id: p.id },
    thumb: partThumbnail(layout, p),
    icon: '',
    name: p.k === 'wire' ? KIND_NAME.wire : p.lab + ' · ' + (KIND_NAME[p.k] ?? ''),
    value: (p.optional ? 'اختياري · ' : '') + p.val,
    where: p.k === 'wire' ? holes : where,
    net: isLead ? netName(p.nets[0]) : '',
    netColor: isLead ? layout.nets[p.nets[0]]?.c ?? '#666' : '',
    note: holeText(p.tip, layout, props.lettersFrom),
    phase: phaseOf(p.s)
  }
})

const traceRows = (layout: PerfLayout): Row[] => layout.traces.map((t, index) => ({
  key: 'trace:' + index,
  item: { kind: 'trace', index },
  thumb: null,
  icon: '🧵',
  name: 'وصلة من تحت',
  value: 'سلك عريان',
  where: [holeName(layout, t.pts[0]) + ' ← → ' + holeName(layout, t.pts[t.pts.length - 1])],
  net: netName(t.net),
  netColor: layout.nets[t.net]?.c ?? '#666',
  note: 'من ناحية اللحام: سلكة على طول الصف، ملحومة في كل نقطة بتعدّي عليها.',
  phase: phaseOf(t.s)
}))

const cutRows = (layout: PerfLayout): Row[] => {
  const spec = layout.strips
  if (!spec || layout.look === 'breadboard') return []
  return spec.cuts.map((c, index) => {
    const whole = Math.floor(c.at)
    const name = (pos: number) => holeName(layout, spec.axis === 'rows' ? [pos, c.strip] : [c.strip, pos])
    const isDrill = Number.isInteger(c.at)
    return {
      key: 'cut:' + index,
      item: { kind: 'cut', index },
      thumb: null,
      icon: '🔴',
      name: 'قطع النحاس',
      value: isDrill ? 'بنطة 3–4 مم' : 'كاتر',
      where: [isDrill ? name(whole) : name(whole) + ' | ' + name(whole + 1)],
      net: '',
      netColor: '',
      note: 'من ناحية النحاس، قبل ما تركّب أي حاجة.',
      phase: 1
    }
  })
}

const rows = computed<Row[]>(() =>
  [...cutRows(props.layout), ...partRows(props.layout), ...traceRows(props.layout)].sort((a, b) => a.phase - b.phase))
</script>

<template>
  <div class="card ptable">
    <p class="pt-sub">كل حاجة هتتركب على البورد، بالترتيب. دوس <b>ورّيني</b> عشان الرسمة اللي فوق توريك مكانها بالظبط.</p>
    <div class="pt-head">
      <span>الشكل</span><span>القطعة</span><span>القيمة</span><span>المكان على البورد</span><span>المرحلة</span><span />
    </div>
    <div v-for="r in rows" :key="r.key" class="pt-row">
      <div class="pt-pic">
        <svg v-if="r.thumb" :viewBox="r.thumb.viewBox" aria-hidden="true" v-html="r.thumb.svg" />
        <span v-else class="pt-icon">{{ r.icon }}</span>
      </div>
      <div class="pt-name"><b>{{ r.name }}</b><small>{{ r.note }}</small></div>
      <div class="pt-val">{{ r.value }}</div>
      <div class="pt-where">
        <span v-for="w in r.where" :key="w">{{ w }}</span>
        <em v-if="r.net"><i :style="{ background: r.netColor }" />{{ r.net }}</em>
      </div>
      <div class="pt-phase">{{ r.phase }}</div>
      <div class="pt-act"><button class="btn pt-show" @click="emit('show', r.item)">ورّيني</button></div>
    </div>
  </div>
</template>

<style scoped>
.ptable{padding:12px 14px}
.pt-sub{margin:0 0 10px;color:var(--muted);font-size:14px}
.pt-head,.pt-row{display:grid;grid-template-columns:86px minmax(0,1.6fr) 110px minmax(0,1.4fr) 64px 84px;gap:10px;align-items:center}
.pt-head{font-size:12.5px;color:var(--muted);padding:0 6px 6px;border-bottom:1px solid var(--line)}
.pt-row{padding:8px 6px;border-bottom:1px solid #1a2236}
.pt-row:last-child{border-bottom:0}
.pt-pic{width:86px;height:52px;display:grid;place-items:center;background:#0d1320;border-radius:8px;direction:ltr}
.pt-pic svg{width:100%;height:100%}
.pt-icon{font-size:24px}
.pt-name b{display:block;font-size:14.5px}
.pt-name small{display:block;color:var(--muted);font-size:12px;line-height:1.5;margin-top:2px}
.pt-val{font-weight:800;color:var(--amber);unicode-bidi:isolate}
.pt-where{display:flex;flex-wrap:wrap;gap:4px;font-size:13px}
.pt-where span{unicode-bidi:isolate;padding:2px 8px;border-radius:999px;background:var(--panel2);font-weight:700}
.pt-where em{display:flex;align-items:center;gap:5px;font-style:normal;color:var(--muted);font-size:12px}
.pt-where i{width:9px;height:9px;border-radius:50%}
.pt-phase{text-align:center;font-weight:800}
.pt-show{padding:6px 12px;font-size:13px}
@media(max-width:760px){
  .pt-head{display:none}
  .pt-row{grid-template-columns:86px minmax(0,1fr);grid-template-areas:'pic name' 'pic val' 'where where' 'phase act'}
  .pt-pic{grid-area:pic}.pt-name{grid-area:name}.pt-val{grid-area:val}.pt-where{grid-area:where}
  .pt-phase{grid-area:phase;text-align:start}.pt-phase::before{content:'المرحلة '}
  .pt-act{grid-area:act;justify-self:end}
}
:deep(.pf-chip){font:700 9px system-ui;fill:#e7ecf5;text-anchor:middle}
:deep(.pf-chip.dim){fill:#9aa6bd}
:deep(.pf-pol){font:900 11px system-ui;text-anchor:middle}
</style>

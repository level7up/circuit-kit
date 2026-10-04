<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCircuit, useGuide } from '../composables/context'
import { boardSize, holeName, perfboardSvg, type BoardType, type Side } from '../lib/perfboard/draw'
import { bestStripboard } from '../lib/perfboard/stripboard'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const asm = useCircuit().assembly!
const { openTab } = useGuide()
const layout = asm.layout
const strip = bestStripboard(layout)
const size = boardSize(layout)
const lastStage = Math.max(...asm.phases.map(p => p.s))

const phase = ref(0)
const side = ref<Side>('top')
const type = ref<BoardType>('perf')
const selected = ref<string | null>(null)
const net = ref<string | null>(null)

const current = computed(() => asm.phases[phase.value])
const checked = ref(asm.phases.map(p => p.c.map(() => false)))
const isDone = (i: number) => checked.value[i].every(Boolean)
const progress = computed(() => {
  const all = checked.value.flat()
  return (all.filter(Boolean).length / all.length) * 100
})
const toggle = (j: number) => {
  checked.value = checked.value.map((row, i) => (i === phase.value ? row.map((v, k) => (k === j ? !v : v)) : row))
}
const goPhase = (i: number) => {
  phase.value = i
  selected.value = null
  net.value = null
}

const svg = computed(() => perfboardSvg(layout, {
  side: side.value,
  type: type.value,
  stage: current.value.s,
  selected: selected.value,
  net: net.value,
  icInserted: current.value.s >= lastStage,
  strip
}))

const freshParts = computed(() => layout.parts.filter(p => p.s === current.value.s))
const part = computed(() => layout.parts.find(p => p.id === selected.value) ?? null)
const partLegs = computed(() => {
  const p = part.value
  if (!p) return []
  const legs = p.legs.map((h, i) => ({ hole: holeName(h), net: p.nets[i], label: p.k === 'dip' ? 'رجل ' + (i + 1) : '' }))
  return p.k === 'dip' ? legs.filter(l => !l.net.startsWith('nc')) : legs
})
const netName = (n: string) => layout.nets[n]?.n ?? 'مش متوصلة'
const netColor = (n: string) => layout.nets[n]?.c ?? '#666'
const stripInfo = computed(() => ({
  cuts: strip.cuts.length,
  knife: strip.cuts.filter(c => !c.drill).length,
  links: strip.links.filter(l => l.s <= current.value.s).length,
  axis: strip.axis === 'cols' ? 'بالطول (من فوق لتحت)' : 'بالعرض (من شمال ليمين)'
}))

const selectPart = (id: string | null) => {
  selected.value = selected.value === id ? null : id
  net.value = null
}
const pickNet = (n: string | null) => {
  net.value = net.value === n ? null : n
  selected.value = null
}
const onBoardClick = (e: MouseEvent) => {
  const target = e.target as Element
  const partEl = target.closest('[data-id]')
  if (partEl) return selectPart(partEl.getAttribute('data-id'))
  const netEl = target.closest('[data-net]')
  if (netEl) return pickNet(netEl.getAttribute('data-net'))
  selected.value = null
  net.value = null
}
</script>

<template>
  <section id="assembly">
    <SectionHead :num="num" :title="asm.title" :sub="asm.sub" />

    <div class="asm-grid">
      <div v-for="c in asm.intro" :key="c.title" class="card" :class="c.kind"><h3>{{ c.title }}</h3><span v-html="c.body" /></div>
    </div>

    <div class="gap" />
    <div class="steps-top">
      <div v-for="(p, i) in asm.phases" :key="p.t" class="sdot" :class="{ on: i === phase, done: isDone(i) }" :title="p.t" role="button" tabindex="0" @click="goPhase(i)" @keydown.enter="goPhase(i)">
        {{ isDone(i) && i !== phase ? '✓' : i + 1 }}
      </div>
    </div>
    <div class="progress"><i :style="{ width: progress + '%' }" /></div>

    <div class="asm-bench">
      <div class="card asm-board">
        <div class="asm-tools">
          <div class="seg" role="group" aria-label="نوع البورد">
            <button :class="{ on: type === 'perf' }" @click="type = 'perf'">بورد نقط</button>
            <button :class="{ on: type === 'strip' }" @click="type = 'strip'">بورد خطوط</button>
          </div>
          <div class="seg" role="group" aria-label="الناحية">
            <button :class="{ on: side === 'top' }" @click="side = 'top'">⬆️ من فوق (المكونات)</button>
            <button :class="{ on: side === 'bottom' }" @click="side = 'bottom'">🔄 من تحت (اللحام)</button>
          </div>
        </div>
        <p v-if="side === 'bottom'" class="asm-hint">ده شكل البورد <b>وهو مقلوب في إيدك</b>: الشمال بقى يمين. الخطوط الفضي = قصدير أو سلك عريان. دوس على أي خط عشان تعرف هو إيه.</p>
        <p v-if="type === 'strip'" class="asm-hint warn">
          بورد خطوط: خلّي الخطوط <b>{{ stripInfo.axis }}</b>. اقطع النحاس في <b>{{ stripInfo.cuts }}</b> مكان من تحت: الدواير الحمرا بتتقطع بلف بنطة 3 مم بإيدك في الخرم، والشُرط الحمرا ({{ stripInfo.knife }}) بالكاتر بين خرمين.
          والوصلات بقت <b>{{ stripInfo.links }}</b> سلكة من فوق لحد المرحلة دي.
        </p>
        <div class="asm-svg" @click="onBoardClick">
          <svg :viewBox="`0 0 ${size.w} ${size.h}`" role="img" aria-label="رسمة البورد المثقّب" v-html="svg" />
        </div>
        <p class="asm-note" v-html="asm.boardNote" />
      </div>

      <div class="asm-side">
        <div v-if="part" class="card">
          <span class="tag">{{ part.lab }} · {{ part.val }}</span>
          <p>{{ part.tip }}</p>
          <ul class="asm-legs">
            <li v-for="l in partLegs" :key="l.hole" role="button" tabindex="0" @click="pickNet(l.net)" @keydown.enter="pickNet(l.net)">
              <i :style="{ background: netColor(l.net) }" /><b>{{ l.hole }}</b><span v-if="l.label">{{ l.label }} ·</span> {{ netName(l.net) }}
            </li>
          </ul>
        </div>
        <div v-else class="card">
          <span class="tag">في المرحلة دي</span>
          <p v-if="!freshParts.length" class="muted">مفيش مكونات. جهّز البورد والأدوات.</p>
          <div v-else class="asm-chips">
            <button v-for="p in freshParts" :key="p.id" class="chip" @click="selectPart(p.id)"><b>{{ p.lab }}</b> {{ p.val }}</button>
          </div>
          <p class="muted small">دوس على أي قطعة في الرسمة عشان تعرف مكانها بالظبط واتجاهها. أو اختار خط تحت عشان تشوف هو رايح فين.</p>
          <div class="asm-chips">
            <button v-for="(n, k) in layout.nets" :key="k" class="chip" :class="{ on: net === k }" @click="pickNet(k)"><i :style="{ background: n.c }" />{{ n.n }}</button>
          </div>
        </div>

        <div class="card step">
          <span class="tag">المرحلة {{ phase + 1 }} من {{ asm.phases.length }}</span>
          <h3>{{ current.t }}</h3>
          <div class="meta">{{ current.m }}</div>
          <div v-html="current.b" />
          <div style="margin-top:10px">
            <label v-for="(c, j) in current.c" :key="c" class="check" :class="{ done: checked[phase][j] }">
              <input type="checkbox" :checked="checked[phase][j]" @change="toggle(j)"><span>{{ c }}</span>
            </label>
          </div>
          <div class="meas">📏 <b>اتأكد:</b> <span v-html="current.x" /></div>
          <div class="navbtns">
            <button class="btn" :disabled="phase === 0" @click="goPhase(phase - 1)">→ السابقة</button>
            <button v-if="phase < asm.phases.length - 1" class="btn pri" @click="goPhase(phase + 1)">التالية ←</button>
            <button v-else class="btn pri" @click="openTab('car')">التركيب في العربية ←</button>
          </div>
        </div>
      </div>
    </div>

    <div class="gap" />
    <h3 class="asm-h">🎓 لو أول مرة تلحم</h3>
    <div class="asm-grid">
      <div v-for="s in asm.skills" :key="s.title" class="card"><h3>{{ s.title }}</h3><div v-html="s.body" /></div>
    </div>

    <div class="gap" />
    <h3 class="asm-h">🚫 غلطات مشهورة</h3>
    <div class="asm-grid">
      <div v-for="m in asm.mistakes" :key="m.title" class="card" :class="m.kind"><h3>{{ m.title }}</h3><span v-html="m.body" /></div>
    </div>
  </section>
</template>

<style scoped>
.asm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.asm-bench{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px;align-items:start}
@media(max-width:1100px){.asm-bench{grid-template-columns:minmax(0,1fr)}}
.asm-board{padding:14px}
.asm-tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.seg button{background:var(--panel2);color:var(--text);border:0;padding:7px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.seg button.on{background:var(--amber);color:#1a1206;font-weight:700}
.asm-hint{font-size:13.5px;margin:0 0 10px;padding:8px 12px;border-radius:10px;background:var(--panel2);color:var(--muted)}
.asm-hint b{color:var(--text)}
.asm-hint.warn{border-right:3px solid var(--amber)}
.asm-svg{direction:ltr;background:#0d1320;border-radius:12px;padding:6px;cursor:pointer}
.asm-svg svg{width:100%;height:auto;display:block}
.asm-note{font-size:13px;color:var(--muted);margin:10px 0 0}
.asm-side{display:grid;gap:14px}
.asm-side p{margin:8px 0}
.asm-legs{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13.5px}
.asm-legs li{display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:8px;background:var(--panel2);cursor:pointer}
.asm-legs i,.asm-chips i{width:10px;height:10px;border-radius:50%;flex:none}
.asm-legs b{direction:ltr;unicode-bidi:isolate;font:800 14px system-ui;letter-spacing:.5px;color:var(--amber)}
.asm-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.muted{color:var(--muted)}
.small{font-size:12.5px}
.asm-h{margin:0 0 12px;font-size:19px}
:deep(.pf-ruler){font:600 9.5px system-ui;fill:#e7ecf5;opacity:.6;text-anchor:middle}
:deep(.pf-lab){font:800 11px system-ui;fill:#111;paint-order:stroke;stroke:#f3e6c8;stroke-width:3px;text-anchor:middle;pointer-events:none}
:deep(.pf-lab.in){fill:#fff;stroke:#0f1d40;font-size:10.5px}
:deep(.pf-blab){font:700 8.5px system-ui;fill:#1b2333;paint-order:stroke;stroke:#e9edf2;stroke-width:2.4px;text-anchor:middle;pointer-events:none}
:deep(.pf-pin){font:700 8.5px system-ui;fill:#ffd24d;paint-order:stroke;stroke:#111;stroke-width:2.4px;text-anchor:middle;pointer-events:none}
:deep(.pf-chip){font:700 9px system-ui;fill:#e7ecf5;text-anchor:middle;pointer-events:none}
:deep(.pf-chip.dim){fill:#9aa6bd}
:deep(.pf-pol){font:900 11px system-ui;text-anchor:middle;pointer-events:none}
:deep(.pf-part){cursor:pointer}
:deep(.pf-part.fresh){filter:drop-shadow(0 0 4px #ffb547)}
:deep(.pf-part.sel){filter:drop-shadow(0 0 6px #5aa9ff) drop-shadow(0 0 2px #5aa9ff)}
:deep(.pf-part.opt){opacity:.45}
:deep(.pf-trace),:deep(.pf-link){cursor:pointer}
:deep(.pf-trace.fresh polyline:first-child){stroke:#fff3d6}
:deep(.pf-trace.on polyline:first-child),:deep(.pf-link.on line:first-child){stroke:#ffb547}
</style>

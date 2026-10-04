<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MiniBoardDef } from '../../types/circuit'
import { boardSize, holeName, perfboardSvg } from '../../lib/perfboard/draw'

const props = defineProps<{ mini: MiniBoardDef }>()
const layout = props.mini.layout
const size = boardSize(layout)

const stage = ref(0)
const selected = ref<string | null>(null)
const current = computed(() => props.mini.stages[stage.value])
const checked = ref(props.mini.stages.map(s => s.c.map(() => false)))
const isDone = (i: number) => checked.value[i].every(Boolean)
const toggle = (j: number) => {
  checked.value = checked.value.map((row, i) => (i === stage.value ? row.map((v, k) => (k === j ? !v : v)) : row))
}
const goStage = (i: number) => {
  stage.value = i
  selected.value = null
}

const svg = computed(() => perfboardSvg(layout, {
  side: 'top',
  stage: current.value.s,
  selected: selected.value,
  net: null,
  icInserted: true
}))

const part = computed(() => layout.parts.find(p => p.id === selected.value) ?? null)
const partLegs = computed(() => {
  const p = part.value
  if (!p) return []
  return p.legs
    .map((h, i) => ({ hole: holeName(layout, h), net: p.nets[i], label: p.k === 'dip' ? 'رجل ' + (i + 1) : '' }))
    .filter(l => !l.net.startsWith('nc'))
})
const freshParts = computed(() => layout.parts.filter(p => p.s === current.value.s && p.k !== 'wire'))
const freshWires = computed(() => layout.parts.filter(p => p.s === current.value.s && p.k === 'wire').length)

const onBoardClick = (e: MouseEvent) => {
  const id = (e.target as Element).closest('[data-id]')?.getAttribute('data-id') ?? null
  selected.value = selected.value === id ? null : id
}
</script>

<template>
  <div class="mini">
    <p class="sub" v-html="mini.sub" />
    <div class="steps-top">
      <div v-for="(s, i) in mini.stages" :key="s.t" class="sdot" :class="{ on: i === stage, done: isDone(i) }" :title="s.t" role="button" tabindex="0" @click="goStage(i)" @keydown.enter="goStage(i)">
        {{ isDone(i) && i !== stage ? '✓' : i + 1 }}
      </div>
    </div>
    <div class="mini-bench">
      <div class="card mini-board">
        <div class="mini-svg" @click="onBoardClick">
          <svg :viewBox="`0 0 ${size.w} ${size.h}`" role="img" aria-label="بريد بورد ميني 170" v-html="svg" />
        </div>
        <div v-if="part" class="mini-info">
          <span class="tag">{{ part.lab || 'سلكة' }} · {{ part.val }}</span>
          <p>{{ part.tip }}</p>
          <ul>
            <li v-for="l in partLegs" :key="l.hole"><i :style="{ background: layout.nets[l.net]?.c }" /><b>{{ l.hole }}</b><span v-if="l.label">{{ l.label }} ·</span> {{ layout.nets[l.net]?.n }}</li>
          </ul>
        </div>
        <div v-else class="mini-info">
          <span class="tag">في المرحلة دي</span>
          <div class="mini-chips">
            <button v-for="p in freshParts" :key="p.id" class="chip" @click="selected = p.id"><b>{{ p.lab }}</b> {{ p.val }}</button>
            <span v-if="freshWires" class="chip">🔌 {{ freshWires }} سلوك</span>
          </div>
          <p class="muted">دوس على أي قطعة أو سلكة في الرسمة عشان تعرف خرومها بالظبط.</p>
        </div>
      </div>
      <div class="card step">
        <span class="tag">المرحلة {{ stage + 1 }} من {{ mini.stages.length }}</span>
        <h3>{{ current.t }}</h3>
        <div v-html="current.b" />
        <div style="margin-top:10px">
          <label v-for="(c, j) in current.c" :key="c" class="check" :class="{ done: checked[stage][j] }">
            <input type="checkbox" :checked="checked[stage][j]" @change="toggle(j)"><span>{{ c }}</span>
          </label>
        </div>
        <div class="meas">📏 <b>اتأكد:</b> <span v-html="current.x" /></div>
        <div class="navbtns">
          <button class="btn" :disabled="stage === 0" @click="goStage(stage - 1)">→ السابقة</button>
          <button class="btn pri" :disabled="stage === mini.stages.length - 1" @click="goStage(stage + 1)">التالية ←</button>
        </div>
      </div>
    </div>
    <div class="mini-notes">
      <div v-for="n in mini.notes" :key="n.title" class="card" :class="n.kind"><h3>{{ n.title }}</h3><span v-html="n.body" /></div>
    </div>
  </div>
</template>

<style scoped>
.mini-bench{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start;margin-top:12px}
@media(max-width:1000px){.mini-bench{grid-template-columns:minmax(0,1fr)}}
.mini-board{padding:14px}
.mini-svg{direction:ltr;background:#0d1320;border-radius:12px;padding:6px;cursor:pointer}
.mini-svg svg{width:100%;height:auto;display:block}
.mini-info{margin-top:12px}
.mini-info p{margin:8px 0}
.mini-info ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13.5px}
.mini-info li{display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:8px;background:var(--panel2)}
.mini-info i{width:10px;height:10px;border-radius:50%;flex:none}
.mini-info b{direction:ltr;unicode-bidi:isolate;font:800 14px system-ui;color:var(--amber)}
.mini-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.muted{color:var(--muted);font-size:13px}
.mini-notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:16px}
:deep(.pf-ruler){font:700 10px system-ui;fill:#55554c;text-anchor:middle}
:deep(.pf-lab){font:800 11px system-ui;fill:#111;paint-order:stroke;stroke:#fff;stroke-width:3px;text-anchor:middle;pointer-events:none}
:deep(.pf-lab.in){fill:#fff;stroke:#0f1d40;font-size:10.5px}
:deep(.pf-chip){font:700 9px system-ui;fill:#e7ecf5;text-anchor:middle;pointer-events:none}
:deep(.pf-pol){font:900 11px system-ui;text-anchor:middle;pointer-events:none}
:deep(.pf-part){cursor:pointer}
:deep(.pf-part.fresh){filter:drop-shadow(0 0 4px #ffb547)}
:deep(.pf-part.sel){filter:drop-shadow(0 0 6px #5aa9ff) drop-shadow(0 0 2px #5aa9ff)}
:deep(.pf-part.opt){opacity:.45}
</style>

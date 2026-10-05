<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCircuit, useGuide } from '../composables/context'
import { boardSize, holeName as nameOf, holeText, perfboardSvg, type LettersFrom, type Side } from '../lib/perfboard/draw'
import type { Hole, PerfLayout } from '../types/circuit'
import { buildItems, hiddenAfter, sideFor, type BuildItem } from '../lib/perfboard/build-items'
import BuildStepper from './BuildStepper.vue'
import PartsTable from './PartsTable.vue'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const asm = useCircuit().assembly!
const { openTab } = useGuide()

const LETTERS_KEY = 'circuit-lab:letters-from'
const readLetters = (): LettersFrom => {
  try {
    return localStorage.getItem(LETTERS_KEY) === 'right' ? 'right' : 'left'
  } catch {
    return 'left'
  }
}
const lettersFrom = ref<LettersFrom>(readLetters())
watch(lettersFrom, v => {
  try {
    localStorage.setItem(LETTERS_KEY, v)
  } catch {
    return
  }
})
const holeName = (l: PerfLayout, h: Hole) => nameOf(l, h, lettersFrom.value)
const txt = (text: string) => holeText(text, layout.value, lettersFrom.value)

const boardIndex = ref(0)
const board = computed(() => asm.boards[boardIndex.value])
const layout = computed(() => board.value.layout)
const phases = computed(() => board.value.phases)
const size = computed(() => boardSize(layout.value))
const lastStage = computed(() => Math.max(...phases.value.map(p => p.s)))

const phase = ref(0)
const side = ref<Side>('top')
const selected = ref<string | null>(null)
const net = ref<string | null>(null)

const current = computed(() => phases.value[phase.value])
const checked = ref(asm.boards.map(b => b.phases.map(p => p.c.map(() => false))))
const boardChecks = computed(() => checked.value[boardIndex.value])
const isDone = (i: number) => boardChecks.value[i].every(Boolean)
const progress = computed(() => {
  const all = boardChecks.value.flat()
  return (all.filter(Boolean).length / all.length) * 100
})
const toggle = (j: number) => {
  checked.value = checked.value.map((rows, b) => (b !== boardIndex.value ? rows
    : rows.map((row, i) => (i === phase.value ? row.map((v, k) => (k === j ? !v : v)) : row))))
}
const itemIndex = ref(0)
const firstStage = computed(() => Math.min(...phases.value.map(p => p.s)))
const itemsOf = (i: number) => buildItems(layout.value, phases.value[i].s, firstStage.value)
const items = computed(() => itemsOf(phase.value))
const item = computed<BuildItem | undefined>(() => items.value[itemIndex.value])
const isFirstItem = computed(() => phase.value === 0 && itemIndex.value === 0)
const isLastItem = computed(() => phase.value === phases.value.length - 1 && itemIndex.value >= items.value.length - 1)

const goPhase = (i: number, at: 'start' | 'end' = 'start') => {
  phase.value = i
  itemIndex.value = at === 'end' ? Math.max(0, itemsOf(i).length - 1) : 0
  selected.value = null
  net.value = null
}
const nextItem = () => {
  if (itemIndex.value < items.value.length - 1) itemIndex.value++
  else if (phase.value < phases.value.length - 1) goPhase(phase.value + 1)
  selected.value = null
}
const prevItem = () => {
  if (itemIndex.value > 0) itemIndex.value--
  else if (phase.value > 0) goPhase(phase.value - 1, 'end')
  selected.value = null
}
const jumpTo = (target: BuildItem) => {
  const key = (it: BuildItem) => it.kind + ':' + (it.kind === 'part' ? it.id : it.index)
  const at = phases.value.findIndex((_, i) => itemsOf(i).some(it => key(it) === key(target)))
  if (at < 0) return
  goPhase(at)
  itemIndex.value = itemsOf(at).findIndex(it => key(it) === key(target))
  document.querySelector('#assembly .asm-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
watch(item, it => { side.value = sideFor(it) })
const pickBoard = (i: number) => {
  boardIndex.value = i
  goPhase(Math.min(phase.value, asm.boards[i].phases.length - 1))
}

const svg = computed(() => perfboardSvg(layout.value, {
  side: side.value,
  stage: current.value.s,
  selected: selected.value ?? focusPart.value,
  net: net.value,
  icInserted: current.value.s >= lastStage.value,
  hidden: hiddenAfter(items.value, itemIndex.value),
  focusTrace: item.value?.kind === 'trace' ? item.value.index : undefined,
  focusCut: item.value?.kind === 'cut' ? item.value.index : undefined,
  lettersFrom: lettersFrom.value
}))
const focusPart = computed(() => (item.value?.kind === 'part' ? item.value.id : null))

const freshParts = computed(() => layout.value.parts.filter(p => p.s === current.value.s))
const part = computed(() => layout.value.parts.find(p => p.id === selected.value) ?? null)
const partLegs = computed(() => {
  const p = part.value
  if (!p) return []
  const legs = p.legs.map((h, i) => ({ hole: holeName(layout.value, h), net: p.nets[i], label: p.k === 'dip' ? 'رجل ' + (i + 1) : '' }))
  return p.k === 'dip' ? legs.filter(l => !l.net.startsWith('nc')) : legs
})
const netName = (n: string) => layout.value.nets[n]?.n ?? 'مش متوصلة'
const netColor = (n: string) => layout.value.nets[n]?.c ?? '#666'
const trails = computed(() => (layout.value.strips ? [] : layout.value.traces
  .filter(t => t.s === current.value.s)
  .map(t => ({ from: holeName(layout.value, t.pts[0]), to: holeName(layout.value, t.pts[t.pts.length - 1]), net: t.net }))))
const stripInfo = computed(() => {
  const strips = layout.value.strips
  if (!strips) return null
  return {
    cuts: strips.cuts.length,
    knife: strips.cuts.filter(c => !Number.isInteger(c.at)).length,
    links: layout.value.parts.filter(p => p.k === 'wire').length
  }
})

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
      <div v-for="(p, i) in phases" :key="p.t" class="sdot" :class="{ on: i === phase, done: isDone(i) }" :title="p.t" role="button" tabindex="0" @click="goPhase(i)" @keydown.enter="goPhase(i)">
        {{ isDone(i) && i !== phase ? '✓' : i + 1 }}
      </div>
    </div>
    <div class="progress"><i :style="{ width: progress + '%' }" /></div>

    <div class="asm-bench">
      <div class="card asm-board">
        <div class="asm-tools">
          <div class="seg" role="group" aria-label="نوع البورد">
            <button v-for="(b, i) in asm.boards" :key="b.id" :class="{ on: boardIndex === i }" @click="pickBoard(i)">{{ b.label }}</button>
          </div>
          <div class="seg" role="group" aria-label="اتجاه الحروف">
            <button :class="{ on: lettersFrom === 'left' }" @click="lettersFrom = 'left'">A من الشمال</button>
            <button :class="{ on: lettersFrom === 'right' }" @click="lettersFrom = 'right'">A من اليمين</button>
          </div>
          <div class="seg" role="group" aria-label="الناحية">
            <button :class="{ on: side === 'top' }" @click="side = 'top'">⬆️ من فوق (المكونات)</button>
            <button :class="{ on: side === 'bottom' }" @click="side = 'bottom'">🔄 من تحت (اللحام)</button>
          </div>
        </div>
        <p v-if="side === 'bottom'" class="asm-hint">ده شكل البورد <b>وهو مقلوب في إيدك</b>: الشمال بقى يمين. الخطوط الفضي = قصدير أو سلك عريان. دوس على أي خط عشان تعرف هو إيه.</p>
        <p v-if="stripInfo" class="asm-hint warn">
          فيرو: اقطع النحاس من تحت في <b>{{ stripInfo.cuts }}</b> مكان (الدواير الحمرا: لف بنطة 3–4 مم بإيدك في الخرم)، وركّب <b>{{ stripInfo.links }}</b> سلوك معزولة من فوق.
        </p>
        <div class="asm-work">
        <div class="asm-svg" @click="onBoardClick">
          <svg :viewBox="`0 0 ${size.w} ${size.h}`" role="img" aria-label="رسمة البورد المثقّب" v-html="svg" />
        </div>
        <BuildStepper :layout="layout" :item="item" :index="itemIndex" :count="items.length" :phase-title="'المرحلة ' + (phase + 1) + ': ' + current.t"
          :letters-from="lettersFrom" :is-first="isFirstItem" :is-last="isLastItem" @prev="prevItem" @next="nextItem" />
        </div>
        <p class="asm-note" v-html="txt(board.note)" />
      </div>

      <div class="asm-side">
        <div v-if="part" class="card">
          <span class="tag">{{ part.lab }} · {{ part.val }}</span>
          <p>{{ txt(part.tip) }}</p>
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
            <button v-for="p in freshParts" :key="p.id" class="chip" @click="selectPart(p.id)"><template v-if="p.k === 'wire'">🔌 {{ holeName(layout, p.legs[0]) }}–{{ holeName(layout, p.legs[1]) }}</template><template v-else><b>{{ p.lab }}</b> {{ p.val }}</template></button>
          </div>
          <p class="muted small">دوس على أي قطعة في الرسمة عشان تعرف مكانها بالظبط واتجاهها. أو اختار خط تحت عشان تشوف هو رايح فين.</p>
          <div class="asm-chips">
            <button v-for="(n, k) in layout.nets" :key="k" class="chip" :class="{ on: net === k }" @click="pickNet(k)"><i :style="{ background: n.c }" />{{ n.n }}</button>
          </div>
        </div>

        <div class="card step">
          <span class="tag">المرحلة {{ phase + 1 }} من {{ phases.length }}</span>
          <h3>{{ current.t }}</h3>
          <div class="meta">{{ txt(current.m) }}</div>
          <div v-html="txt(current.b)" />
          <div style="margin-top:10px">
            <label v-for="(c, j) in current.c" :key="c" class="check" :class="{ done: boardChecks[phase][j] }">
              <input type="checkbox" :checked="boardChecks[phase][j]" @change="toggle(j)"><span>{{ txt(c) }}</span>
            </label>
          </div>
          <div v-if="trails.length" class="asm-trails">
            <b>🧵 الوصلات اللي تحت في المرحلة دي ({{ trails.length }}):</b>
            <ul>
              <li v-for="t in trails" :key="t.from + t.to"><i :style="{ background: netColor(t.net) }" /><b>{{ t.from }}</b> ← → <b>{{ t.to }}</b> <span>{{ netName(t.net) }}</span></li>
            </ul>
          </div>
          <div class="meas">📏 <b>اتأكد:</b> <span v-html="txt(current.x)" /></div>
          <div class="navbtns">
            <button class="btn" :disabled="phase === 0" @click="goPhase(phase - 1)">→ السابقة</button>
            <button v-if="phase < phases.length - 1" class="btn pri" @click="goPhase(phase + 1)">التالية ←</button>
            <button v-else class="btn pri" @click="openTab('car')">التركيب في العربية ←</button>
          </div>
        </div>
      </div>
    </div>

    <div class="gap" />
    <h3 class="asm-h">📋 جدول كل القطع والسلوك ({{ board.label }})</h3>
    <PartsTable :layout="layout" :phases="phases" :letters-from="lettersFrom" @show="jumpTo" />

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
.asm-bench{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}
.asm-board{--asmw:min(1560px,calc(100vw - 32px));width:var(--asmw);margin-inline:calc((100% - var(--asmw))/2);padding:14px}
.asm-tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.seg button{background:var(--panel2);color:var(--text);border:0;padding:7px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.seg button.on{background:var(--amber);color:#1a1206;font-weight:700}
.asm-hint{font-size:13.5px;margin:0 0 10px;padding:8px 12px;border-radius:10px;background:var(--panel2);color:var(--muted)}
.asm-hint b{color:var(--text)}
.asm-hint.warn{border-right:3px solid var(--amber)}
.asm-work{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}
.asm-work :deep(.stepper){margin-top:0}
@media(max-width:1100px){.asm-work{grid-template-columns:minmax(0,1fr)}.asm-work :deep(.stepper){margin-top:12px}}
.asm-svg{direction:ltr;background:#0d1320;border-radius:12px;padding:6px;cursor:pointer}
.asm-svg svg{width:100%;height:auto;display:block}
.asm-note{font-size:13px;color:var(--muted);margin:10px 0 0}
.asm-side{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:14px;align-items:start}
@media(max-width:900px){.asm-side{grid-template-columns:minmax(0,1fr)}}
.asm-side p{margin:8px 0}
.asm-legs{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13.5px}
.asm-legs li{display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:8px;background:var(--panel2);cursor:pointer}
.asm-legs i,.asm-chips i{width:10px;height:10px;border-radius:50%;flex:none}
.asm-legs b{direction:ltr;unicode-bidi:isolate;font:800 14px system-ui;letter-spacing:.5px;color:var(--amber)}
.asm-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.muted{color:var(--muted)}
.small{font-size:12.5px}
.asm-trails{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--panel2);font-size:13.5px}
.asm-trails ul{list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px}
.asm-trails li{display:flex;align-items:center;gap:6px}
.asm-trails li i{width:9px;height:9px;border-radius:50%;flex:none}
.asm-trails li b{direction:ltr;unicode-bidi:isolate;color:var(--amber)}
.asm-trails li span{color:var(--muted);font-size:12px}
.asm-h{margin:0 0 12px;font-size:19px}
:deep(.pf-ruler){font:800 11px system-ui;fill:#2a2014;text-anchor:middle}
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

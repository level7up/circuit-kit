<script setup lang="ts">
import { computed, ref } from 'vue'
import { HOME_HREF } from '../../circuits'
import { lessonMeta, lessonSteps } from '../../learn/breadboard-lesson'
import { allStrips, hasRailHole, holeXY, isRail, parseHole, stripBox } from '../../lib/breadboard/geometry'
import { boardBaseSvg, boardDefsSvg, boardHolesSvg, drawPart } from '../../lib/breadboard/draw'

const RAIL_LABELS: [string, string, 'r' | 'b'][] = [['tp', '+', 'r'], ['tn', '−', 'b'], ['bn', '−', 'b'], ['bp', '+', 'r']]
const PICK_COLOR = '#facc15'
const RAIL_NAMES: Record<string, string> = { tp: 'خط + اللي فوق', tn: 'خط − اللي فوق', bn: 'خط − اللي تحت', bp: 'خط + اللي تحت' }

document.title = lessonMeta.title

const staticSvg = boardDefsSvg() + `<rect x="0" y="36" width="1460" height="440" style="fill:url(#bbMat)"/>` + boardBaseSvg() + boardHolesSvg(RAIL_LABELS)
const strips = allStrips().map(id => ({ id, box: stripBox(id) }))
const demoCtx = { wireColor: () => '#2563eb', ohm: () => undefined, text: () => undefined, color: () => '#ffc83d', variant: () => undefined, dead: () => false }

const index = ref(0)
const picked = ref<{ hole: string; strip: string } | null>(null)
const step = computed(() => lessonSteps[index.value])
const demo = computed(() => step.value.demo.map(p => ({ id: p.id, svg: drawPart(p, demoCtx) })))
const highlights = computed(() => [
  ...step.value.highlights,
  ...(picked.value ? [{ strip: picked.value.strip, color: PICK_COLOR }] : [])
])
const marks = computed(() => step.value.marks.map(h => holeXY(h)))

function holesOf(strip: string): string[] {
  if (isRail(strip)) return Array.from({ length: 61 }, (_, i) => i + 2).filter(hasRailHole).map(c => strip + c)
  const col = +strip.slice(1)
  return (strip[0] === 'T' ? 'abcde' : 'fghij').split('').map(r => r + col)
}

function nearestHole(strip: string, x: number, y: number): string {
  return holesOf(strip).reduce((best, h) => {
    const a = holeXY(h)
    const b = holeXY(best)
    return Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? h : best
  })
}

const svgEl = ref<SVGSVGElement | null>(null)
function onClick(e: MouseEvent) {
  const strip = (e.target as Element).closest<SVGRectElement>('.bs')?.dataset.s
  if (!strip || !svgEl.value) { picked.value = null; return }
  const pt = svgEl.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const local = pt.matrixTransform(svgEl.value.getScreenCTM()?.inverse())
  picked.value = { hole: nearestHole(strip, local.x, local.y), strip }
}

const pickedInfo = computed(() => {
  const p = picked.value
  if (!p) return null
  const others = holesOf(p.strip).filter(h => h !== p.hole)
  const q = parseHole(p.hole)
  const where = isRail(p.strip) ? RAIL_NAMES[p.strip] : `العمود ${q?.col} ${p.strip[0] === 'T' ? 'فوق' : 'تحت'}`
  return { hole: p.hole, where, count: others.length, list: isRail(p.strip) ? '' : others.join('، ') }
})

const go = (i: number) => { index.value = Math.max(0, Math.min(lessonSteps.length - 1, i)) }
</script>

<template>
  <a class="homelink" :href="HOME_HREF">← الصفحة الرئيسية</a>
  <div class="wrap guide-title">
    <span class="tag">{{ lessonMeta.tag }}</span>
    <h1>{{ lessonMeta.icon }} {{ lessonMeta.title }}</h1>
  </div>
  <main class="wrap lesson">
    <div class="steps-top" role="tablist" aria-label="خطوات الدرس">
      <button v-for="(s, i) in lessonSteps" :key="s.title" class="sdot" :class="{ on: i === index, done: i < index }" role="tab" :aria-selected="i === index" :title="s.title" @click="go(i)">{{ i + 1 }}</button>
    </div>
    <div class="card lesson-step">
      <h3>{{ step.title }}</h3>
      <p v-html="step.body" />
      <div class="navbtns">
        <button class="btn" :disabled="index === 0" @click="go(index - 1)">→ السابقة</button>
        <button class="btn pri" :disabled="index === lessonSteps.length - 1" @click="go(index + 1)">التالية ←</button>
      </div>
    </div>
    <div class="bbwrap lesson-board">
      <svg id="bb" ref="svgEl" viewBox="120 90 1180 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="بريد بورد فاضي" @click="onClick">
        <g v-html="staticSvg" />
        <g id="bbHL">
          <rect v-for="h in highlights" :key="h.strip + h.color" :x="stripBox(h.strip).x" :y="stripBox(h.strip).y" :width="stripBox(h.strip).w" :height="stripBox(h.strip).h" rx="6" class="bb-hl" :style="{ stroke: h.color, fill: h.color }" />
        </g>
        <rect v-for="s in strips" :key="s.id" :x="s.box.x" :y="s.box.y" :width="s.box.w" :height="s.box.h" class="bs" :data-s="s.id" />
        <g filter="url(#bbSh)" style="pointer-events:none">
          <g v-for="d in demo" :key="d.id" v-html="d.svg" />
        </g>
        <circle v-for="(m, i) in marks" :key="i" :cx="m.x" :cy="m.y" r="7" class="lesson-mark" />
        <circle v-if="picked" :cx="holeXY(picked.hole).x" :cy="holeXY(picked.hole).y" r="7" class="lesson-mark lesson-pick" />
      </svg>
    </div>
    <div class="card lesson-pickinfo" aria-live="polite">
      <template v-if="pickedInfo">
        <b>🔎 الخرم <code>{{ pickedInfo.hole }}</code> · {{ pickedInfo.where }}</b>
        <p v-if="pickedInfo.list">متوصل بـ {{ pickedInfo.count }} خرم: <code>{{ pickedInfo.list }}</code></p>
        <p v-else>متوصل بكل الخرم اللي في الخط ده على طول البورد ({{ pickedInfo.count }} خرم).</p>
      </template>
      <span v-else>👆 دوس على أي خرم في البورد وشوف إيه اللي متوصل بيه.</span>
    </div>
  </main>
  <footer>معمل الدواير · أدلة تعليمية تفاعلية</footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PerfLayout } from '../types/circuit'
import type { BuildItem } from '../lib/perfboard/build-items'
import { holeName as nameOf, holeText, type LettersFrom } from '../lib/perfboard/draw'

const props = defineProps<{
  layout: PerfLayout
  item: BuildItem | undefined
  index: number
  count: number
  phaseTitle: string
  isFirst: boolean
  lettersFrom: LettersFrom
  isLast: boolean
}>()
const emit = defineEmits<{ prev: []; next: [] }>()

interface Leg {
  hole: string
  label: string
  net: string
  color: string
}

interface Card {
  icon: string
  title: string
  body: string
  legs: Leg[]
}

const holeName = (l: PerfLayout, h: [number, number]) => nameOf(l, h, props.lettersFrom)
const netName = (n: string) => props.layout.nets[n]?.n ?? 'مش متوصلة'
const netColor = (n: string) => props.layout.nets[n]?.c ?? '#666'

function cutCard(index: number): Card {
  const spec = props.layout.strips!
  const c = spec.cuts[index]
  const whole = Math.floor(c.at)
  const hole = (pos: number) => holeName(props.layout, spec.axis === 'rows' ? [pos, c.strip] : [c.strip, pos])
  return Number.isInteger(c.at)
    ? { icon: '🔴', title: 'قطع النحاس عند ' + hole(whole), body: 'اقلب البورد. حط بنطة 3–4 مم في الخرم ده ولفّها بإيدك لحد ما النحاس حوالين الخرم يتشال كله.', legs: [] }
    : { icon: '🔪', title: 'قطع النحاس بين ' + hole(whole) + ' و' + hole(whole + 1), body: 'اقلب البورد. اعمل حزّين بالكاتر بين الخرمين دول واشيل شريحة النحاس اللي بينهم.', legs: [] }
}

function traceCard(index: number): Card {
  const t = props.layout.traces[index]
  const from = holeName(props.layout, t.pts[0])
  const to = holeName(props.layout, t.pts[t.pts.length - 1])
  return {
    icon: '🧵',
    title: 'وصلة من تحت: ' + from + ' ← → ' + to,
    body: 'اقلب البورد. افرد سلكة عريانة (أو رجل مقصوصة) من ' + from + ' لـ ' + to + '، ولحّمها في كل نقطة بتعدّي عليها.',
    legs: [{ hole: from + ' → ' + to, label: '', net: netName(t.net), color: netColor(t.net) }]
  }
}

function partCard(id: string): Card {
  const p = props.layout.parts.find(x => x.id === id)!
  const legs = p.legs
    .map((h, i) => ({ hole: holeName(props.layout, h), label: p.k === 'dip' ? 'رجل ' + (i + 1) : '', net: netName(p.nets[i]), color: netColor(p.nets[i]), raw: p.nets[i] }))
    .filter(l => !l.raw.startsWith('nc'))
  const title = p.k === 'wire' ? 'سلكة معزولة من فوق' : p.lab + ' · ' + p.val
  const icon = p.k === 'wire' ? '🔌' : p.k === 'pad' ? '🔗' : p.optional ? '➕' : '📍'
  return { icon, title: (p.optional ? 'اختياري: ' : '') + title, body: holeText(p.tip, props.layout, props.lettersFrom), legs: p.k === 'dip' ? [legs[0], legs[legs.length - 1]] : legs }
}

const card = computed<Card | null>(() => {
  const it = props.item
  if (!it) return null
  if (it.kind === 'cut') return cutCard(it.index)
  if (it.kind === 'trace') return traceCard(it.index)
  return partCard(it.id)
})
</script>

<template>
  <div class="stepper">
    <div class="st-head">
      <span class="tag">{{ phaseTitle }}</span>
      <span v-if="count" class="st-count">{{ index + 1 }} / {{ count }}</span>
    </div>
    <div v-if="count" class="st-bar"><i :style="{ width: ((index + 1) / count) * 100 + '%' }" /></div>
    <div v-if="card" class="st-card">
      <h3><span>{{ card.icon }}</span> {{ card.title }}</h3>
      <p>{{ card.body }}</p>
      <ul v-if="card.legs.length">
        <li v-for="l in card.legs" :key="l.hole + l.label"><i :style="{ background: l.color }" /><b>{{ l.hole }}</b><span v-if="l.label">{{ l.label }} ·</span> {{ l.net }}</li>
      </ul>
    </div>
    <p v-else class="st-empty">مفيش قطع في المرحلة دي. اقرا الخطوات اللي جنب الرسمة، وبعدين دوس التالي.</p>
    <div class="st-nav">
      <button class="btn" :disabled="isFirst" @click="emit('prev')">→ السابق</button>
      <button class="btn pri st-next" :disabled="isLast" @click="emit('next')">{{ count && index + 1 < count ? 'ركّبتها، التالي ←' : 'المرحلة الجاية ←' }}</button>
    </div>
  </div>
</template>

<style scoped>
.stepper{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--panel2);border:1px solid var(--line)}
.st-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.st-count{font-weight:800;color:var(--amber);direction:ltr}
.st-bar{height:5px;border-radius:99px;background:var(--panel);overflow:hidden;margin:8px 0 10px}
.st-bar i{display:block;height:100%;background:var(--amber);transition:width .25s}
.st-card h3{margin:0 0 6px;font-size:17px}
.st-card p{margin:0 0 8px;font-size:14.5px;line-height:1.7}
.st-card ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.st-card li{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--panel);font-size:13px}
.st-card li i{width:9px;height:9px;border-radius:50%;flex:none}
.st-card li b{direction:ltr;unicode-bidi:isolate;font:800 14px system-ui;color:var(--amber)}
.st-empty{margin:8px 0;color:var(--muted);font-size:14px}
.st-nav{display:flex;justify-content:space-between;gap:10px;margin-top:12px}
.st-next{flex:1;max-width:320px;font-size:15px}
</style>

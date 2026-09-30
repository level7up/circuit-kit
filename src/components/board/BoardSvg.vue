<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { AnyBoard, BoardPart } from '../../types/circuit'
import { allStrips, stripBox } from '../../lib/breadboard/geometry'
import { Z_ORDER, boardBaseSvg, boardDefsSvg, boardHolesSvg, drawPart, glowCenter } from '../../lib/breadboard/draw'
import type { Highlight } from '../../lib/breadboard/logic'

const RAIL_LABELS: [string, string, 'r' | 'b'][] = [['tp', '+5V', 'r'], ['tn', 'GND', 'b'], ['bn', 'GND', 'b'], ['bp', '+12V', 'r']]
const GLOW_FLOOR = 0.02
const MAT_LABEL_Y = 450

const props = defineProps<{
  board: AnyBoard
  params: unknown
  parts: BoardPart[]
  visible: Set<string>
  ghosts: Set<string>
  focus: Set<string> | null
  highlights: Highlight[]
  outlineIds: string[]
  outlineKind: 'sel' | 'new'
  brightness: number
  showLabels: boolean
  tooltip: (target: { part?: string; strip?: string }) => string
}>()
const emit = defineEmits<{ part: [id: string, at: { x: number; y: number; width: number }]; strip: [strip: string]; clear: [] }>()

const wrap = ref<HTMLDivElement | null>(null)
const svg = ref<SVGSVGElement | null>(null)
defineExpose({ wrap })

const staticSvg = boardDefsSvg() + `<rect x="0" y="36" width="1460" height="440" style="fill:url(#bbMat)"/>` + boardBaseSvg() + boardHolesSvg(RAIL_LABELS)
const strips = allStrips().map(id => ({ id, box: stripBox(id) }))
const dyn = computed(() => props.board.dynamics)

const ordered = computed(() => [...props.parts].sort((a, b) => Z_ORDER[a.k] - Z_ORDER[b.k]))
const drawn = computed(() => {
  const p = props.params
  const ctx = {
    wireColor: (net: string) => props.board.wireColors[net] ?? '#64748b',
    ohm: (part: BoardPart) => dyn.value.ohm(part.id, p),
    text: (part: BoardPart) => dyn.value.partText(part.id, p),
    color: () => dyn.value.glowColor(p),
    variant: (part: BoardPart) => dyn.value.partVariant(part.id, p),
    dead: () => dyn.value.partDead(p)
  }
  return Object.fromEntries(ordered.value.map(part => [part.id, drawPart(part, ctx)]))
})

const ALWAYS_LIT = new Set(['lamp', 'led'])
const alwaysLit = computed(() => new Set(props.parts.filter(p => ALWAYS_LIT.has(p.k)).map(p => p.id)))
const partClass = (id: string) => ({
  hide: !props.visible.has(id) && !props.ghosts.has(id),
  ghost: props.ghosts.has(id),
  dim: !!props.focus && !props.focus.has(id) && !props.ghosts.has(id) && !alwaysLit.value.has(id)
})

const labels = computed(() => ordered.value.filter(p => props.board.labels[p.id]).map(p => {
  const [x, y, text, anchor, sub] = props.board.labels[p.id]
  return {
    id: p.id, x, y, anchor, mat: y > MAT_LABEL_Y,
    text: dyn.value.labelText(p.id, text, props.params),
    sub: sub ? dyn.value.labelSub(p.id, sub, props.params) : ''
  }
}))

const glow = computed(() => {
  const part = props.parts.find(p => (p.k === 'lamp' || p.k === 'led') && props.visible.has(p.id))
  if (!part) return null
  const c = glowCenter(part, dyn.value.partVariant(part.id, props.params))
  return { ...c, opacity: (GLOW_FLOOR + (1 - GLOW_FLOOR) * props.brightness ** 2).toFixed(3), coreOpacity: props.brightness.toFixed(3) }
})

const outlines = ref<{ x: number; y: number; w: number; h: number }[]>([])
const measure = () => {
  outlines.value = props.outlineIds.flatMap(id => {
    const g = svg.value?.querySelector<SVGGElement>(`.bp[data-id="${id}"]`)
    if (!g || g.classList.contains('hide')) return []
    const b = g.getBBox()
    return [{ x: b.x - 5, y: b.y - 5, w: b.width + 10, h: b.height + 10 }]
  })
}
watch(() => [props.outlineIds, props.visible, drawn.value], () => nextTick(measure), { immediate: true, flush: 'post' })

const glowColor = computed(() => dyn.value.glowColor(props.params))
const netColor = (net: string) => props.board.nets[net]?.c ?? '#94a3b8'

const tip = ref({ text: '', x: 0, y: 0 })
const onMove = (e: MouseEvent) => {
  const el = e.target as Element
  const part = el.closest<SVGGElement>('.bp')?.dataset.id
  const strip = el.closest<SVGRectElement>('.bs')?.dataset.s
  const text = part || strip ? props.tooltip({ part, strip }) : ''
  const r = wrap.value?.getBoundingClientRect()
  tip.value = { text, x: e.clientX - (r?.left ?? 0) + 14, y: e.clientY - (r?.top ?? 0) + 16 }
}
const pointIn = (clientX: number, clientY: number) => {
  const r = wrap.value?.getBoundingClientRect()
  return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0), width: r?.width ?? 0 }
}
const onClick = (e: MouseEvent) => {
  const el = e.target as Element
  const part = el.closest<SVGGElement>('.bp')?.dataset.id
  if (part) return emit('part', part, pointIn(e.clientX, e.clientY))
  const strip = el.closest<SVGRectElement>('.bs')?.dataset.s
  if (strip) return emit('strip', strip)
  emit('clear')
}
const onKey = (e: KeyboardEvent) => {
  const g = (e.target as Element).closest<SVGGElement>('.bp')
  const part = g?.dataset.id
  if (!g || !part || (e.key !== 'Enter' && e.key !== ' ')) return
  e.preventDefault()
  const b = g.getBoundingClientRect()
  emit('part', part, pointIn(b.left + b.width / 2, b.top + b.height / 2))
}
</script>

<template>
  <div id="bbWrap" ref="wrap" class="bbwrap">
    <svg id="bb" ref="svg" :class="{ nolab: !showLabels }" :viewBox="board.viewBox" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="الدايرة على بريد بورد"
      @click="onClick" @keydown="onKey" @mousemove="onMove" @mouseleave="tip.text = ''">
      <g v-html="staticSvg" />
      <rect v-for="s in strips" :key="s.id" :x="s.box.x" :y="s.box.y" :width="s.box.w" :height="s.box.h" class="bs" :data-s="s.id" />
      <g id="bbHL">
        <rect v-for="h in highlights" :key="h.strip" v-bind="{ x: stripBox(h.strip).x, y: stripBox(h.strip).y, width: stripBox(h.strip).w, height: stripBox(h.strip).h }" rx="6" class="bb-hl" :style="{ stroke: netColor(h.net), fill: netColor(h.net) }" />
      </g>
      <g id="bbParts" filter="url(#bbSh)">
        <radialGradient id="bbGlowDyn">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".95" />
          <stop offset=".35" :stop-color="glowColor" stop-opacity=".6" />
          <stop offset="1" :stop-color="glowColor" stop-opacity="0" />
        </radialGradient>
        <circle v-if="glow" id="bbGlow" :cx="glow.x" :cy="glow.y" :r="glow.r" style="fill:url(#bbGlowDyn)" :style="{ opacity: glow.opacity }" />
        <g v-for="p in ordered" :key="p.id" class="bp" :class="partClass(p.id)" :data-id="p.id" tabindex="0" role="button" :aria-label="tooltip({ part: p.id })" v-html="drawn[p.id]" />
      </g>
      <g v-if="glow" class="bb-core">
        <radialGradient id="bbCoreG">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".95" />
          <stop offset=".5" :stop-color="glowColor" stop-opacity=".7" />
          <stop offset="1" :stop-color="glowColor" stop-opacity="0" />
        </radialGradient>
        <circle :cx="glow.core.x" :cy="glow.core.y" :r="glow.core.r" style="fill:url(#bbCoreG)" :style="{ opacity: glow.coreOpacity }" />
      </g>
      <g id="bbLab">
        <g v-for="l in labels" :key="l.id" class="bb-labg" :class="partClass(l.id)">
          <text :x="l.x" :y="l.y" :text-anchor="l.anchor" class="bb-lab" :class="{ 'bb-lab-m': l.mat }">{{ l.text }}</text>
          <text v-if="l.sub" :x="l.x" :y="l.y + 11" :text-anchor="l.anchor" class="bb-lab bb-lab-v">{{ l.sub }}</text>
        </g>
      </g>
      <g id="bbOut">
        <rect v-for="(o, i) in outlines" :key="i" :x="o.x" :y="o.y" :width="o.w" :height="o.h" rx="7" :class="outlineKind === 'sel' ? 'bb-out-sel' : 'bb-out-new'" />
      </g>
    </svg>
    <slot />
    <div v-if="tip.text" class="bbtip" style="display:block" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">{{ tip.text }}</div>
  </div>
</template>

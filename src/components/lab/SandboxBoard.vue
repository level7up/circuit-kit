<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Point } from '../../types/circuit'
import { holeXY, stripBox, stripOf } from '../../lib/breadboard/geometry'
import { boardBaseSvg, boardDefsSvg, boardHolesSvg } from '../../lib/breadboard/draw'
import { drawSandboxPart } from '../../lib/sandbox/draw'
import { nearestHole } from '../../lib/sandbox/placement'
import type { SandboxPart, SolveResult } from '../../lib/sandbox/solver'

export interface Ghost {
  part: SandboxPart
  valid: boolean
}

const RAIL_LABELS: [string, string, 'r' | 'b'][] = [['tp', '+', 'r'], ['tn', '−', 'b'], ['bn', '−', 'b'], ['bp', '+', 'r']]
const staticSvg = boardDefsSvg() + `<rect x="0" y="36" width="1460" height="440" style="fill:url(#bbMat)"/>` + boardBaseSvg() + boardHolesSvg(RAIL_LABELS)

const props = defineProps<{
  parts: SandboxPart[]
  result: SolveResult
  selected: string | null
  ghost: Ghost | null
  wireStart: string | null
  probe: string | null
  labels: Record<string, string>
}>()
const emit = defineEmits<{ partDown: [id: string, e: PointerEvent]; hole: [hole: string]; background: [] }>()

const svg = ref<SVGSVGElement | null>(null)

function toBoard(clientX: number, clientY: number): Point | null {
  const el = svg.value
  const m = el?.getScreenCTM()
  if (!el || !m) return null
  const pt = el.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const p = pt.matrixTransform(m.inverse())
  return { x: p.x, y: p.y }
}

function holeAt(clientX: number, clientY: number): string | null {
  const r = svg.value?.getBoundingClientRect()
  if (!r || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null
  const p = toBoard(clientX, clientY)
  return p ? nearestHole(p) : null
}

const insideBoard = (clientX: number, clientY: number) => {
  const r = svg.value?.getBoundingClientRect()
  return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
}

defineExpose({ holeAt, insideBoard })

const drawn = computed(() => props.parts.map(p => ({ p, svg: drawSandboxPart(p, props.result.parts[p.id]) })))
const ghostSvg = computed(() => (props.ghost ? drawSandboxPart(props.ghost.part) : ''))
const ghostBoxes = computed(() => (props.ghost ? [props.ghost.part.a, props.ghost.part.b].map(h => holeXY(h)) : []))
const probeBox = computed(() => (props.probe ? stripBox(stripOf(props.probe)) : null))

const onPointerDown = (e: PointerEvent) => {
  const id = (e.target as Element).closest<SVGGElement>('.sb-part')?.dataset.id
  if (id) { emit('partDown', id, e); return }
}
const onClick = (e: MouseEvent) => {
  if ((e.target as Element).closest('.sb-part')) return
  const h = holeAt(e.clientX, e.clientY)
  if (h) emit('hole', h)
  else emit('background')
}
</script>

<template>
  <div class="bbwrap lesson-board sb-board">
    <svg id="bb" ref="svg" viewBox="120 90 1180 370" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="بريد بورد المعمل الحر" @pointerdown="onPointerDown" @click="onClick">
      <g v-html="staticSvg" />
      <rect v-if="probeBox" :x="probeBox.x" :y="probeBox.y" :width="probeBox.w" :height="probeBox.h" rx="6" class="bb-hl" style="stroke:#facc15;fill:#facc15" />
      <g filter="url(#bbSh)">
        <g v-for="d in drawn" :key="d.p.id" class="sb-part" :class="{ sel: d.p.id === selected, hot: result.parts[d.p.id]?.hot }" :data-id="d.p.id" v-html="d.svg" />
      </g>
      <g v-if="ghost" class="sb-ghost" :class="{ bad: !ghost.valid }">
        <g v-html="ghostSvg" />
        <circle v-for="(g, i) in ghostBoxes" :key="i" :cx="g.x" :cy="g.y" r="7" class="sb-ghost-hole" />
      </g>
      <circle v-if="wireStart" :cx="holeXY(wireStart).x" :cy="holeXY(wireStart).y" r="8" class="lesson-mark" />
      <g class="sb-labels">
        <text v-for="d in drawn.filter(x => x.p.kind !== 'wire')" :key="'l' + d.p.id" :x="(holeXY(d.p.a).x + holeXY(d.p.b).x) / 2" :y="Math.min(holeXY(d.p.a).y, holeXY(d.p.b).y) - 14" class="bb-lab" text-anchor="middle">{{ labels[d.p.id] }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Point {
  x: number
  y: number
}

const props = defineProps<{
  left: number
  top: number
  bottom: number
  plus: Point
  minus: Point
  name: string
  color: string
  level: number
  removed: boolean
}>()

const STRIP_W = 30
const BULB_R = 16

const RING_MAX_R = 55
const RING_LED = 9

const kind = computed(() => {
  if (props.name.includes('حلق')) return 'ring'
  if (props.name.includes('شريط')) return 'strip'
  if (props.name.startsWith('2 ×')) return 'pair'
  return 'bulb'
})
const ledCount = computed(() => (props.name.includes('10 لمبات') ? 10 : 20))
const stripX = computed(() => props.left + 40)
const centerX = computed(() => stripX.value + STRIP_W / 2)
const leds = computed(() => {
  const n = ledCount.value
  const span = props.bottom - props.top - 40
  return Array.from({ length: n }, (_, i) => props.top + 20 + (span * (i + 0.5)) / n)
})
const bulbs = computed(() => {
  const mid = (props.plus.y + props.minus.y) / 2
  return kind.value === 'pair' ? [mid - 26, mid + 26] : [mid]
})
const ring = computed(() => {
  const cy = (props.top + props.bottom) / 2
  const r = Math.min(RING_MAX_R, (props.bottom - props.top) / 2 - 20)
  const n = Number(props.name.match(/\d+/)?.[0] ?? 18)
  const leds = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return { x: centerX.value + Math.cos(a) * r, y: cy + Math.sin(a) * r, deg: (a * 180) / Math.PI + 90 }
  })
  return { cy, r, leds }
})
const plusEnd = computed(() => ({
  x: centerX.value,
  y: kind.value === 'strip' ? props.top + 6 : kind.value === 'ring' ? ring.value.cy - ring.value.r : bulbs.value[0] - BULB_R
}))
const minusEnd = computed(() => ({
  x: centerX.value,
  y: kind.value === 'strip' ? props.bottom - 6 : kind.value === 'ring' ? ring.value.cy + ring.value.r : bulbs.value[bulbs.value.length - 1] + BULB_R
}))
const wire = (from: Point, to: Point, lift: number) => `M${from.x} ${from.y} H${from.x + 18} V${to.y + lift} H${to.x} V${to.y}`
const glow = computed(() => (props.removed ? 0 : props.level))
</script>

<template>
  <g class="board-lamp" data-id="LAMP" :class="{ removed }">
    <path :d="wire(plus, plusEnd, -12)" fill="none" stroke="#000" stroke-width="7" stroke-linejoin="round" />
    <path :d="wire(plus, plusEnd, -12)" fill="none" stroke="#f5c518" stroke-width="4.5" stroke-linejoin="round" />
    <path :d="wire(minus, minusEnd, 12)" fill="none" stroke="#000" stroke-width="7" stroke-linejoin="round" />
    <path :d="wire(minus, minusEnd, 12)" fill="none" stroke="#3b82f6" stroke-width="4.5" stroke-linejoin="round" />

    <template v-if="kind === 'ring'">
      <circle :cx="centerX" :cy="ring.cy" :r="ring.r" fill="none" :stroke="color" stroke-width="18" :opacity="glow * 0.45" class="lamp-halo" />
      <circle :cx="centerX" :cy="ring.cy" :r="ring.r" fill="none" stroke="#ece7d6" stroke-width="12" />
      <rect v-for="(l, i) in ring.leds" :key="i" :x="l.x - RING_LED / 2" :y="l.y - RING_LED / 2" :width="RING_LED" :height="RING_LED" rx="2"
        :transform="`rotate(${l.deg} ${l.x} ${l.y})`" fill="#7d7868" />
      <circle :cx="centerX" :cy="ring.cy" :r="ring.r" fill="none" :stroke="color" stroke-width="6" :opacity="glow" />
    </template>
    <template v-else-if="kind === 'strip'">
      <rect :x="stripX - 14" :y="top - 10" :width="STRIP_W + 28" :height="bottom - top + 20" rx="16" :fill="color" :opacity="glow * 0.4" class="lamp-halo" />
      <rect :x="stripX" :y="top" :width="STRIP_W" :height="bottom - top" rx="4" fill="#ece7d6" stroke="#b8b2a0" />
      <text :x="centerX" :y="top + 15" class="lamp-pol">+</text>
      <text :x="centerX" :y="bottom - 5" class="lamp-pol">−</text>
      <g v-for="(y, i) in leds" :key="i">
        <rect :x="stripX + 7" :y="y - 6" width="16" height="12" rx="2" fill="#7d7868" stroke="#5c584b" />
        <rect :x="stripX + 5" :y="y - 8" width="20" height="16" rx="4" :fill="color" :opacity="glow * 0.5" class="lamp-halo" />
        <rect :x="stripX + 9" :y="y - 4" width="12" height="8" rx="2" :fill="color" :opacity="glow" />
      </g>
    </template>
    <template v-else>
      <g v-for="(y, i) in bulbs" :key="i">
        <circle :cx="centerX" :cy="y" :r="BULB_R * 2.2" :fill="color" :opacity="glow * 0.4" class="lamp-halo" />
        <circle :cx="centerX" :cy="y" :r="BULB_R" fill="#2a2a2a" stroke="#888" />
        <circle :cx="centerX" :cy="y" :r="BULB_R - 4" :fill="color" :opacity="glow" />
      </g>
    </template>
    <text :x="centerX" :y="bottom + 24" class="lamp-name">{{ removed ? 'متشال' : name }}</text>
  </g>
</template>

<style scoped>
.board-lamp{cursor:pointer}
.board-lamp.removed{opacity:.35}
.lamp-halo{filter:blur(6px)}
.lamp-pol{font:900 12px system-ui;fill:#555;text-anchor:middle;pointer-events:none}
.lamp-name{font:800 11px system-ui;fill:#e7ecf5;text-anchor:middle;pointer-events:none}
</style>

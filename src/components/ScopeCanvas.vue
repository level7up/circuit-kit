<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HISTORY_SAMPLES } from '../composables/useSimulation'
import { useSim } from '../composables/context'
import type { TraceDef } from '../types/circuit'

const props = withDefaults(defineProps<{ keys?: string[]; compact?: boolean }>(), { keys: undefined, compact: false })
const sim = useSim()
const canvas = ref<HTMLCanvasElement | null>(null)
const LANE_GAP = 10
const LABEL_W = 82

type AnyTrace = TraceDef<any>

function sizeCanvas(cv: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1
  const W = cv.clientWidth
  const H = cv.clientHeight
  if (!W) return null
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
  const c = cv.getContext('2d')
  c?.setTransform(dpr, 0, 0, dpr, 0, 0)
  c?.clearRect(0, 0, W, H)
  return c
}

function plot(c: CanvasRenderingContext2D, data: number[], t: AnyTrace, x0: number, x1: number, y: number, h: number) {
  if (data.length < 2) return
  const px = (i: number) => x0 + (i / (HISTORY_SAMPLES - 1)) * (x1 - x0)
  const py = (v: number) => y + h - 3 - (v / t.max) * (h - 6)
  c.beginPath()
  data.forEach((v, i) => (i ? c.lineTo(px(i), py(v)) : c.moveTo(px(i), py(v))))
  c.strokeStyle = t.color
  c.lineWidth = 1.7
  c.stroke()
  if (!t.fill) return
  c.lineTo(px(data.length - 1), y + h)
  c.lineTo(x0, y + h)
  c.closePath()
  c.fillStyle = 'rgba(255,181,71,.22)'
  c.fill()
}

function drawFull(c: CanvasRenderingContext2D, W: number) {
  const x0 = 8
  const x1 = W - LABEL_W
  const hist = sim.history()
  let y = 8
  sim.model.traces.forEach((t: AnyTrace, i: number) => {
    c.fillStyle = '#8f9bb6'; c.font = '12px Tahoma, Arial'; c.textAlign = 'left'
    c.fillText(t.label, x1 + 8, y + Math.min(17, t.height / 2 + 5))
    c.strokeStyle = '#1c2436'; c.lineWidth = 1; c.strokeRect(x0 + .5, y + .5, x1 - x0, t.height)
    if (t.threshold) {
      const ty = y + t.height - 3 - (t.threshold.value / t.max) * (t.height - 6)
      c.setLineDash([5, 5]); c.strokeStyle = '#7a5f2a'; c.beginPath(); c.moveTo(x0, ty); c.lineTo(x1, ty); c.stroke(); c.setLineDash([])
      c.fillStyle = '#b8944e'; c.font = '10px Tahoma'; c.fillText(t.threshold.label, x0 + 4, ty - 4)
    }
    if (t.topLabel) { c.fillStyle = '#5b6680'; c.font = '10px Tahoma'; c.fillText(t.topLabel, x0 + 4, y + 12) }
    plot(c, hist[i], t, x0, x1, y, t.height)
    y += t.height + LANE_GAP
  })
}

function drawCompact(c: CanvasRenderingContext2D, W: number, H: number) {
  const hist = sim.history()
  sim.model.traces.forEach((t: AnyTrace, i: number) => {
    if (props.keys?.includes(t.key)) plot(c, hist[i], t, 0, W, 0, H)
  })
}

function draw() {
  const cv = canvas.value
  if (!cv) return
  const c = sizeCanvas(cv)
  if (!c) return
  if (props.compact) drawCompact(c, cv.clientWidth, cv.clientHeight)
  else drawFull(c, cv.clientWidth)
}

let stop: (() => void) | null = null
onMounted(() => { stop = watch(sim.frame, draw) })
onBeforeUnmount(() => stop?.())
</script>

<template>
  <canvas ref="canvas" />
</template>

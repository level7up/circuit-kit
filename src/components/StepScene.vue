<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import type { SceneFrame } from '../types/circuit'
import { SCENE_H, SCENE_W } from '../lib/scene/draw'

const AUTOPLAY_MS = 4500
const SPOT_R = 13

const props = defineProps<{ frames: SceneFrame[] }>()

const index = ref(0)
const spot = ref<number | null>(null)
const playing = ref(false)
let timer = 0

const frame = computed(() => props.frames[index.value])
const activeSpot = computed(() => (spot.value === null ? null : frame.value.spots?.[spot.value] ?? null))
const isLast = computed(() => index.value === props.frames.length - 1)

const stop = () => {
  playing.value = false
  window.clearInterval(timer)
}
const go = (i: number) => {
  index.value = Math.max(0, Math.min(props.frames.length - 1, i))
  spot.value = null
}
const next = () => (isLast.value ? stop() : go(index.value + 1))
const play = () => {
  if (playing.value) return stop()
  if (isLast.value) go(0)
  playing.value = true
  timer = window.setInterval(next, AUTOPLAY_MS)
}
const pickSpot = (i: number) => {
  stop()
  spot.value = spot.value === i ? null : i
}

watch(() => props.frames, () => {
  stop()
  go(0)
})
onDeactivated(stop)
onBeforeUnmount(stop)
</script>

<template>
  <div class="scene">
    <div class="sc-stage">
      <svg :viewBox="`0 0 ${SCENE_W} ${SCENE_H}`" role="img" :aria-label="'رسمة توضيحية ' + (index + 1)">
        <defs><filter id="sc-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter></defs>
        <g :key="index" class="sc-frame" v-html="frame.svg" />
        <g v-for="(s, i) in frame.spots ?? []" :key="i" class="sc-spot" :class="{ on: spot === i }" role="button" tabindex="0"
          @click="pickSpot(i)" @keydown.enter="pickSpot(i)">
          <circle :cx="s.x" :cy="s.y" :r="SPOT_R + 6" class="sc-ping" />
          <circle :cx="s.x" :cy="s.y" :r="SPOT_R" />
          <text :x="s.x" :y="s.y + 5">{{ i + 1 }}</text>
        </g>
      </svg>
    </div>
    <p class="sc-say" v-html="frame.say" />
    <div v-if="activeSpot" class="sc-info">
      <b>{{ (spot ?? 0) + 1 }}. {{ activeSpot.t }}</b>
      <span v-html="activeSpot.d" />
    </div>
    <p v-else-if="frame.spots?.length" class="sc-hint">👆 دوس على الدواير المرقّمة في الرسمة عشان تعرف كل حتة بتعمل إيه.</p>
    <div class="sc-nav">
      <button class="btn" :disabled="index === 0" @click="stop(); go(index - 1)">→</button>
      <div class="sc-dots">
        <button v-for="(_, i) in frames" :key="i" :class="{ on: i === index }" :aria-label="'لقطة ' + (i + 1)" @click="stop(); go(i)" />
      </div>
      <button class="btn" :disabled="isLast" @click="stop(); go(index + 1)">←</button>
      <button class="btn pri sc-play" @click="play">{{ playing ? '⏸ وقّف' : '▶ اشرحلي' }}</button>
    </div>
  </div>
</template>

<style scoped>
.scene{display:flex;flex-direction:column;gap:10px}
.sc-stage{background:#0d1320;border-radius:12px;padding:6px;direction:ltr}
.sc-stage svg{width:100%;height:auto;display:block}
.sc-frame{animation:sc-in .45s ease}
@keyframes sc-in{from{opacity:0}to{opacity:1}}
.sc-say{margin:0;font-size:15px;line-height:1.7;min-height:3.4em}
.sc-info{padding:10px 12px;border-radius:10px;background:var(--panel2);border-right:3px solid var(--amber);font-size:14px;line-height:1.7}
.sc-info b{display:block;color:var(--amber);margin-bottom:2px}
.sc-hint{margin:0;color:var(--muted);font-size:13px}
.sc-nav{display:flex;align-items:center;gap:8px}
.sc-dots{display:flex;gap:6px;flex:1;justify-content:center;flex-wrap:wrap}
.sc-dots button{width:11px;height:11px;border-radius:50%;border:0;padding:0;background:var(--line);cursor:pointer}
.sc-dots button.on{background:var(--amber);transform:scale(1.25)}
.sc-play{min-width:110px}
.sc-spot{cursor:pointer}
.sc-spot circle{fill:#ffb547;stroke:#1a1206;stroke-width:2}
.sc-spot .sc-ping{fill:none;stroke:#ffb547;stroke-width:2;animation:sc-ping 1.6s ease-out infinite}
.sc-spot.on circle{fill:#5aa9ff}
.sc-spot text{font:900 14px system-ui;fill:#1a1206;text-anchor:middle;pointer-events:none}
@keyframes sc-ping{from{opacity:.9;r:13}to{opacity:0;r:26}}
:deep(.sc-txt){font-family:system-ui,'Segoe UI',Tahoma,sans-serif}
:deep(.sc-pulse){animation:sc-pulse 1.2s ease-in-out infinite}
@keyframes sc-pulse{50%{opacity:.25}}
:deep(.sc-fade){animation:sc-fade 3.2s ease-in-out infinite}
@keyframes sc-fade{0%,8%{opacity:.08}40%,85%{opacity:1}100%{opacity:.08}}
:deep(.sc-blink){animation:sc-pulse .9s steps(2) infinite}
</style>

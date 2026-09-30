<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { AnyBoard, BoardPart } from '../../types/circuit'
import AltOptions from './AltOptions.vue'

const STATUS_ICON = { ok: '✅', warn: '⚠️', bad: '⛔' } as const
const WIDTH = 310
const EDGE = 8

const props = defineProps<{
  board: AnyBoard
  part: BoardPart
  easy: boolean
  swaps: Record<string, number>
  removed: boolean
  x: number
  y: number
  areaWidth: number
}>()
const emit = defineEmits<{ close: []; choose: [key: string, index: number]; toggleRemoved: [id: string]; details: [] }>()

const eduKey = computed(() => props.board.eduOf[props.part.id] ?? props.board.eduFallback)
const edu = computed(() => props.board.edu[eduKey.value])
const title = computed(() => {
  if (props.easy || props.part.k === 'jumper') return `${edu.value.ic} ${props.part.lab ?? props.part.id} · ${edu.value.n}`
  return props.board.partInfo[props.part.info ?? props.part.id]?.n ?? props.part.id
})
const effect = computed(() => props.board.removal.effects[props.part.id])
const style = computed(() => {
  const width = Math.min(WIDTH, props.areaWidth - EDGE * 2)
  const left = props.x + width + EDGE > props.areaWidth ? Math.max(EDGE, props.x - width - 12) : props.x + 12
  return { left: left + 'px', top: props.y + 12 + 'px', width: width + 'px' }
})

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="bbpop" :style="style" role="dialog" :aria-label="title" @click.stop>
    <div class="bbpop-head">
      <b>{{ title }}</b>
      <button class="bbpop-x" aria-label="اقفل" @click="emit('close')">✖</button>
    </div>
    <p class="bbpop-short">{{ edu.short }}</p>
    <div v-if="effect" class="bbpop-rm">
      <button class="btn" :class="{ pri: removed }" @click="emit('toggleRemoved', part.id)">{{ removed ? '↩️ رجّع القطعة مكانها' : '🗑️ شيل القطعة دي' }}</button>
      <div v-if="removed" class="res" :class="'st-' + effect.st">{{ STATUS_ICON[effect.st] }} {{ effect.r }}</div>
    </div>
    <AltOptions v-if="!removed" :options="board.alternatives[eduKey]" :current="swaps[eduKey] ?? 0" @choose="i => emit('choose', eduKey, i)" />
    <button class="bbpop-more" @click="emit('details')">📖 الشرح الكامل ↓</button>
  </div>
</template>

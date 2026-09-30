<script setup lang="ts">
import { computed } from 'vue'
import type { AnyBoard } from '../../types/circuit'
import AltOptions from './AltOptions.vue'

const props = defineProps<{ board: AnyBoard; swaps: Record<string, number> }>()
const emit = defineEmits<{ show: [partId: string]; choose: [key: string, index: number, partId: string] }>()

const cards = computed(() => Object.entries(props.board.edu).map(([key, e]) => {
  const ids = props.board.parts.filter(p => (props.board.eduOf[p.id] ?? props.board.eduFallback) === key).map(p => p.id)
  const first = ids.find(i => /^J\d/.test(i)) ?? ids[0]
  return { key, e, first, tag: key === props.board.eduFallback ? 'J1 … J' + ids.filter(i => /^J\d/.test(i)).length : ids.join(' · ') }
}))
</script>

<template>
  <div id="bbDict" class="bbdict">
    <div v-for="c in cards" :key="c.key" class="card bbcard" role="button" tabindex="0" @click="emit('show', c.first)" @keydown.enter.self="emit('show', c.first)">
      <h4>{{ c.e.ic }} {{ c.e.n }}</h4>
      <span class="ids">{{ c.tag }}</span>
      <p>{{ c.e.why }}</p>
      <AltOptions :options="board.alternatives[c.key]" :current="swaps[c.key] ?? 0" @choose="i => emit('choose', c.key, i, c.first)" />
    </div>
  </div>
</template>

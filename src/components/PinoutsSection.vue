<script setup lang="ts">
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const pin = useCircuit().pinouts!
</script>

<template>
  <section id="pinouts">
    <SectionHead :num="num" :title="pin.title" :sub="pin.sub" />
    <div class="pins">
      <div v-for="(svg, i) in pin.chips" :key="i" class="card"><div v-html="svg" /></div>
    </div>
    <div class="pol-grid">
      <div v-for="c in pin.polarity" :key="c.title" class="card"><h3>{{ c.title }}</h3><span v-html="c.body" /></div>
    </div>
  </section>
</template>

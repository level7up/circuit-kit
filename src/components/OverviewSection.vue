<script setup lang="ts">
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const ov = useCircuit().overview!
</script>

<template>
  <section id="overview">
    <SectionHead :num="num" :title="ov.title" :sub="ov.sub" />
    <div class="flow">
      <div v-for="s in ov.stages" :key="s.title" class="card">
        <div class="ico">{{ s.icon }}</div><span class="tag">{{ s.stage }}</span>
        <h3>{{ s.title }}</h3><span v-html="s.body" />
      </div>
    </div>
    <div class="gap" />
    <div class="two">
      <div v-for="c in ov.cards" :key="c.title" class="card" :class="c.kind"><h3>{{ c.title }}</h3><span v-html="c.body" /></div>
    </div>
  </section>
</template>

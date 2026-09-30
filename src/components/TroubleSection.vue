<script setup lang="ts">
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const tr = useCircuit().trouble!
</script>

<template>
  <section id="trouble">
    <SectionHead :num="num" :title="tr.title" :sub="tr.sub" />
    <details v-for="t in tr.items" :key="t.q">
      <summary>{{ t.q }}</summary>
      <ul><li v-for="a in t.a" :key="a" v-html="a" /></ul>
    </details>
  </section>
</template>

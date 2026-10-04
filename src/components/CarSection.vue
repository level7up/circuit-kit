<script setup lang="ts">
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'
import CarFaceSim from './CarFaceSim.vue'

defineProps<{ num: number }>()
const car = useCircuit().car!
const svg = car.svg()
</script>

<template>
  <section id="car">
    <SectionHead :num="num" :title="car.title" :sub="car.sub" />
    <h3 class="car-h">🚗 شكلها على العربية (محاكي لايف)</h3>
    <CarFaceSim />
    <div class="gap" />
    <h3 class="car-h">🔌 التوصيل</h3>
    <div class="card carsvg"><div v-html="svg" /></div>
    <div class="gap" />
    <div class="two">
      <div v-for="c in car.cards" :key="c.title" class="card" :class="c.kind"><h3>{{ c.title }}</h3><span v-html="c.body" /></div>
    </div>
  </section>
</template>

<style scoped>
.car-h{margin:0 0 12px;font-size:19px}
</style>

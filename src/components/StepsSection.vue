<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCircuit, useGuide } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const st = useCircuit().steps!
const { step } = useGuide()
const checked = ref(st.items.map(s => s.c.map(() => false)))
const doneStep = (i: number) => checked.value[i].every(Boolean)
const progress = computed(() => {
  const all = checked.value.flat()
  return (all.filter(Boolean).length / all.length) * 100
})
const current = computed(() => st.items[step.value])
const toggle = (j: number) => {
  checked.value = checked.value.map((row, i) => (i === step.value ? row.map((v, k) => (k === j ? !v : v)) : row))
}
</script>

<template>
  <section id="steps">
    <SectionHead :num="num" :title="st.title" :sub="st.sub" />
    <div class="steps-top">
      <div v-for="(s, i) in st.items" :key="s.t" class="sdot" :class="{ on: i === step, done: doneStep(i) }" :title="s.t" role="button" tabindex="0" @click="step = i" @keydown.enter="step = i">
        {{ doneStep(i) && i !== step ? '✓' : i + 1 }}
      </div>
    </div>
    <div class="progress"><i :style="{ width: progress + '%' }" /></div>
    <div class="card step">
      <span class="tag">الخطوة {{ step + 1 }} من {{ st.items.length }}</span>
      <h3>{{ current.t }}</h3>
      <div class="meta">{{ current.m }}</div>
      <div v-html="current.b" />
      <div style="margin-top:10px">
        <label v-for="(c, j) in current.c" :key="c" class="check" :class="{ done: checked[step][j] }">
          <input type="checkbox" :checked="checked[step][j]" @change="toggle(j)"><span>{{ c }}</span>
        </label>
      </div>
      <div class="meas">📏 <b>المفروض تقيس / تشوف:</b> <span v-html="current.x" /></div>
      <div class="navbtns">
        <button class="btn" :disabled="step === 0" @click="step--">→ السابقة</button>
        <button class="btn pri" :disabled="step === st.items.length - 1" @click="step++">التالية ←</button>
      </div>
    </div>
  </section>
</template>

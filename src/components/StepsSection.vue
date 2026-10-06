<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCircuit, useGuide } from '../composables/context'
import SectionHead from './SectionHead.vue'
import StepScene from './StepScene.vue'

defineProps<{ num: number }>()
const st = useCircuit().steps!
const { step } = useGuide()
const variants = st.variants ?? [{ id: 'main', label: '', items: st.items }]
const variantIndex = ref(0)
const items = computed(() => variants[variantIndex.value].items)
const checked = ref(variants.map(v => v.items.map(s => s.c.map(() => false))))
const rows = computed(() => checked.value[variantIndex.value])
const doneStep = (i: number) => rows.value[i].every(Boolean)
const progress = computed(() => {
  const all = rows.value.flat()
  return (all.filter(Boolean).length / all.length) * 100
})
const current = computed(() => items.value[Math.min(step.value, items.value.length - 1)])
const toggle = (j: number) => {
  checked.value = checked.value.map((variant, v) => (v !== variantIndex.value ? variant
    : variant.map((row, i) => (i === step.value ? row.map((x, k) => (k === j ? !x : x)) : row))))
}
watch(variantIndex, () => { step.value = Math.min(step.value, items.value.length - 1) })
</script>

<template>
  <section id="steps">
    <SectionHead :num="num" :title="st.title" :sub="st.sub" />
    <div v-if="st.variants" class="seg st-variants" role="group" aria-label="طريقة العمل">
      <button v-for="(v, i) in variants" :key="v.id" :class="{ on: variantIndex === i }" @click="variantIndex = i">{{ v.label }}</button>
    </div>
    <div class="steps-top">
      <div v-for="(s, i) in items" :key="s.t" class="sdot" :class="{ on: i === step, done: doneStep(i) }" :title="s.t" role="button" tabindex="0" @click="step = i" @keydown.enter="step = i">
        {{ doneStep(i) && i !== step ? '✓' : i + 1 }}
      </div>
    </div>
    <div class="progress"><i :style="{ width: progress + '%' }" /></div>
    <div class="st-work" :class="{ 'has-scene': current.scene }">
    <div v-if="current.scene" class="card st-scene"><StepScene :frames="current.scene" /></div>
    <div class="card step">
      <span class="tag">الخطوة {{ step + 1 }} من {{ items.length }}</span>
      <h3>{{ current.t }}</h3>
      <div class="meta">{{ current.m }}</div>
      <div v-html="current.b" />
      <div style="margin-top:10px">
        <label v-for="(c, j) in current.c" :key="c" class="check" :class="{ done: rows[step][j] }">
          <input type="checkbox" :checked="rows[step][j]" @change="toggle(j)"><span>{{ c }}</span>
        </label>
      </div>
      <div class="meas">📏 <b>المفروض تقيس / تشوف:</b> <span v-html="current.x" /></div>
      <div class="navbtns">
        <button class="btn" :disabled="step === 0" @click="step--">→ السابقة</button>
        <button class="btn pri" :disabled="step === items.length - 1" @click="step++">التالية ←</button>
      </div>
    </div>
    </div>
  </section>
</template>

<style scoped>
.st-variants{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;margin-bottom:14px}
.st-variants button{background:var(--panel2);color:var(--text);border:0;padding:9px 18px;font:inherit;font-size:15px;cursor:pointer}
.st-variants button.on{background:var(--amber);color:#1a1206;font-weight:800}
.st-work.has-scene{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}
.st-work.has-scene .step{margin-top:0}
.st-scene{padding:12px;position:sticky;top:64px}
@media(max-width:960px){.st-work.has-scene{grid-template-columns:minmax(0,1fr)}.st-scene{position:static}}
</style>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const sch = useCircuit().schematic!
const tab = ref(sch.tabs[0].key)
const colored = ref(true)
const selected = ref<string | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)
const drawing = computed(() => sch.render(tab.value))
const info = computed(() => (selected.value ? sch.info[selected.value] : null))

const markSelected = () => {
  svgEl.value?.querySelectorAll<SVGGElement>('.comp').forEach(g => g.classList.toggle('sel', g.dataset.id === selected.value))
}
watch([drawing, selected], () => nextTick(markSelected), { flush: 'post' })

const onClick = (e: MouseEvent) => {
  const g = (e.target as Element).closest<SVGGElement>('.comp')
  if (g?.dataset.id) selected.value = g.dataset.id
}
</script>

<template>
  <section id="schematic">
    <SectionHead :num="num" :title="sch.title" :sub="sch.sub" />
    <div class="sch-grid">
      <div>
        <div id="schTabs">
          <button v-for="t in sch.tabs" :key="t.key" class="btn" :class="{ pri: t.key === tab }" @click="tab = t.key">{{ t.label }}</button>
        </div>
        <div class="flagnote" v-html="sch.note" />
        <div class="svgwrap paper">
          <svg id="sch" ref="svgEl" class="paper" :class="{ colored }" :viewBox="drawing.viewBox" xmlns="http://www.w3.org/2000/svg" @click="onClick" v-html="drawing.svg" />
        </div>
        <div class="legend">
          <button class="btn" @click="colored = !colored">🎨 لوّن الخطوط</button>
          <span v-for="l in sch.legend" :key="l.label"><i :style="{ background: l.color }" />{{ l.label }}</span>
        </div>
      </div>
      <div class="card info">
        <template v-if="info">
          <h3>{{ info.n }}</h3>
          <div class="val">{{ info.v }}</div>
          <p style="margin:0">{{ info.t }}</p>
          <div v-if="info.p" class="pol">📌 {{ info.p }}</div>
        </template>
        <div v-else v-html="sch.emptyInfo" />
      </div>
    </div>
  </section>
</template>

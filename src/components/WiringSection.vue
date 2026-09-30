<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const w = useCircuit().wiring!
const blank = () => w.groups.map(g => g.i.map(() => false))
const checked = ref(blank())
const done = computed(() => checked.value.flat().filter(Boolean).length)
const total = computed(() => checked.value.flat().length)
const toggle = (g: number, i: number) => {
  checked.value = checked.value.map((row, gi) => (gi === g ? row.map((v, ii) => (ii === i ? !v : v)) : row))
}
</script>

<template>
  <section id="wiring">
    <SectionHead :num="num" :title="w.title" :sub="w.sub" />
    <div class="card" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <span class="wcount">✔ <b style="color:var(--text)">{{ done }}</b> من <b style="color:var(--text)">{{ total }}</b> وصلة اتراجعت<template v-if="done === total"> — <span style="color:var(--green)">كله تمام 🎉</span></template></span>
      <button class="btn" @click="checked = blank()">↺ امسح العلامات</button>
    </div>
    <div class="two">
      <div v-for="(g, gi) in w.groups" :key="g.g" class="card wiregrp">
        <h4>{{ g.g }}</h4>
        <label v-for="(t, ti) in g.i" :key="t" class="check" :class="{ done: checked[gi][ti] }">
          <input type="checkbox" :checked="checked[gi][ti]" @change="toggle(gi, ti)"><span>{{ t }}</span>
        </label>
      </div>
    </div>
  </section>
</template>

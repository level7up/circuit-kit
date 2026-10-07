<script setup lang="ts">
import { computed } from 'vue'
import { useCircuit, useSim } from '../composables/context'
import type { CarFaceToggle } from '../types/circuit'

const circuit = useCircuit()
const sim = useSim()
const def = circuit.livePreview
const svg = computed(() => {
  void sim.frame.value
  return def ? def.render(sim.state(), sim.params.value) : ''
})
const toggles = computed(() => (def?.toggles ?? []).filter(t => t.show?.(sim.params.value) ?? true))
const setToggle = (t: CarFaceToggle<Record<string, unknown>>, v: number) => sim.setParams(t.set(sim.base.value, v))
</script>

<template>
  <div v-if="def" class="card live">
    <div class="lp-tools">
      <div v-for="t in toggles" :key="t.label" class="seg" role="group" :aria-label="t.label">
        <button v-for="o in t.options" :key="o.v" :class="{ on: t.get(sim.params.value) === o.v }" @click="setToggle(t, o.v)">{{ o.text }}</button>
      </div>
      <button class="btn" @click="sim.setRunning(!sim.running.value)">{{ sim.running.value ? '⏸ إيقاف' : '▶ تشغيل' }}</button>
    </div>
    <div class="lp-svg" v-html="svg" />
    <p class="lp-note" v-html="def.note" />
  </div>
</template>

<style scoped>
.live{padding:14px}
.lp-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.seg button{background:var(--panel2);color:var(--text);border:0;padding:7px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.seg button.on{background:var(--amber);color:#1a1206;font-weight:700}
.lp-svg :deep(svg){width:100%;max-width:640px;height:auto;display:block;margin:0 auto}
.lp-note{margin:8px 0 0;font-size:13px;color:var(--muted)}
</style>

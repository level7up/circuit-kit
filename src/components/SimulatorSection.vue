<script setup lang="ts">
import { computed } from 'vue'
import { useCircuit, useSim } from '../composables/context'
import LampBulb from './LampBulb.vue'
import ScopeCanvas from './ScopeCanvas.vue'
import SectionHead from './SectionHead.vue'
import StripPreview from './StripPreview.vue'

defineProps<{ num: number }>()
const sim = useSim()
const circuit = useCircuit()
const model = sim.model
const readouts = computed(() => {
  void sim.frame.value
  return model.readouts.map(r => ({ label: r.label, value: r.value(sim.state(), sim.params.value) }))
})
const onPick = (i: number, e: Event) => {
  const v = +(e.target as HTMLSelectElement).value
  sim.setParams(model.controls[i].set(sim.base.value, v))
}
</script>

<template>
  <section id="sim">
    <SectionHead :num="num" :title="model.title" :sub="model.sub" />
    <StripPreview v-if="circuit.stripPreview" style="margin-bottom:14px" />
    <div class="sim-grid">
      <div class="card ctrl">
        <div class="simtop">
          <div class="minibulb"><LampBulb /></div>
          <div class="readout">
            <template v-for="r in readouts" :key="r.label"><span>{{ r.label }}</span><b>{{ r.value }}</b><span /></template>
          </div>
        </div>
        <template v-for="(c, i) in model.controls" :key="c.key">
          <label :for="'ctl-' + c.key">{{ c.label }} <span>{{ c.hint(sim.params.value) }}</span></label>
          <select :id="'ctl-' + c.key" :value="c.get(sim.base.value)" @change="onPick(i, $event)">
            <option v-for="o in c.options" :key="o" :value="o">{{ c.format(o) }}{{ c.isDefault(o) ? ' (الأصلي)' : '' }}</option>
          </select>
        </template>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn pri" @click="sim.setRunning(!sim.running.value)">{{ sim.running.value ? '⏸ إيقاف' : '▶ تشغيل' }}</button>
          <button class="btn" @click="sim.resetAll()">↺ القيم الأصلية</button>
        </div>
        <p style="font-size:13px;color:var(--muted);margin:14px 0 0">{{ model.note }}</p>
      </div>
      <div class="card">
        <ScopeCanvas id="scope" />
        <p style="font-size:13px;color:var(--muted);margin:10px 0 0">{{ model.footnote }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { KIND_NAME, LED_COLORS, RESISTOR_VALUES } from '../../lab/sandbox-content'
import { ldrOhms } from '../../lib/sandbox/solver'
import { fmtR } from '../../lib/format'
import type { Sandbox } from '../../composables/useSandbox'

const props = defineProps<{ sandbox: Sandbox }>()
const sb = props.sandbox
const part = computed(() => sb.selectedPart.value)
const reading = computed(() => (part.value ? sb.result.value.parts[part.value.id] : undefined))
const note = ref('')
watch(() => part.value?.id, () => { note.value = '' })
const rotate = () => {
  if (part.value) note.value = sb.rotate(part.value.id) ? '' : 'مفيش مكان يلف فيه هنا. حرّكه لمكان فاضي الأول.'
}
</script>

<template>
  <div class="card sb-inspector">
    <template v-if="part">
      <h3>{{ sb.labels.value[part.id] }} · {{ KIND_NAME[part.kind] }}</h3>
      <p v-if="reading && part.kind === 'npn'" class="sb-reading">
        تيار القاعدة (B): <b>{{ ((reading.ib ?? 0) * 1000).toFixed(2) }} mA</b> · تيار الكولكتور (C): <b>{{ ((reading.ic ?? 0) * 1000).toFixed(1) }} mA</b>
      </p>
      <p v-else-if="reading && !['wire', 'switch', 'button'].includes(part.kind)" class="sb-reading">
        التيار: <b>{{ (Math.abs(reading.current) * 1000).toFixed(1) }} mA</b> · الجهد عليها: <b>{{ Math.abs(reading.voltage).toFixed(2) }} V</b>
      </p>
      <label v-if="part.kind === 'pot'">المفتاح ملفوف: {{ Math.round((part.level ?? 0.5) * 100) }}%
        <input type="range" min="0" max="1" step="0.01" :value="part.level ?? 0.5" @input="sb.update(part.id, { level: +($event.target as HTMLInputElement).value })">
      </label>
      <label v-if="part.kind === 'ldr'">☀️ الإضاءة: {{ Math.round((part.level ?? 0.5) * 100) }}% (المقاومة {{ fmtR(Math.round(ldrOhms(part.level))) }})
        <input type="range" min="0" max="1" step="0.01" :value="part.level ?? 0.5" @input="sb.update(part.id, { level: +($event.target as HTMLInputElement).value })">
      </label>
      <label v-if="part.kind === 'res'">القيمة
        <select :value="part.ohms" @change="sb.update(part.id, { ohms: +($event.target as HTMLSelectElement).value })">
          <option v-for="v in RESISTOR_VALUES" :key="v" :value="v">{{ fmtR(v) }}</option>
        </select>
      </label>
      <label v-if="part.kind === 'led'">اللون
        <select :value="part.color" @change="sb.update(part.id, { color: ($event.target as HTMLSelectElement).value as never })">
          <option v-for="c in LED_COLORS" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
      </label>
      <div class="sb-actions">
        <button v-if="part.kind === 'switch'" class="btn pri" @click="sb.update(part.id, { closed: !part.closed })">{{ part.closed ? '⏹ افصله (OFF)' : '▶ شغّله (ON)' }}</button>
        <button v-if="part.kind === 'button'" class="btn pri" @pointerdown="sb.update(part.id, { pressed: true })" @pointerup="sb.update(part.id, { pressed: false })" @pointerleave="sb.update(part.id, { pressed: false })">👇 اضغط واستمر</button>
        <button v-if="part.burned" class="btn pri" @click="sb.update(part.id, { burned: false, burnCurrent: undefined })">🔧 حط واحدة جديدة</button>
        <button v-if="['led', 'diode', 'buzzer'].includes(part.kind)" class="btn" @click="sb.flip(part.id)">↩️ اقلبه</button>
        <button v-if="part.kind !== 'wire'" class="btn" @click="rotate">⟳ لفّه</button>
        <button class="btn" @click="sb.remove(part.id)">🗑️ شيله</button>
      </div>
      <p v-if="note" class="res st-warn">{{ note }}</p>
      <p class="sb-tip">حرّكه بالسحب. اسحبه برّه البورد عشان تشيله.</p>
    </template>
    <p v-else class="sb-tip">دوس على أي قطعة على البورد عشان تغيّر قيمتها أو لونها أو تلفها أو تشيلها. ودوس على أي خرم تقيس الجهد عليه.</p>
  </div>
</template>

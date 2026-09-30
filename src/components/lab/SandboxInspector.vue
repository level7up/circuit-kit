<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LED_COLORS, RESISTOR_VALUES } from '../../lab/sandbox-content'
import { fmtR } from '../../lib/format'
import type { Sandbox } from '../../composables/useSandbox'

const props = defineProps<{ sandbox: Sandbox }>()
const sb = props.sandbox
const part = computed(() => sb.selectedPart.value)
const reading = computed(() => (part.value ? sb.result.value.parts[part.value.id] : undefined))
const kindName = { res: 'مقاومة', led: 'LED', switch: 'مفتاح', wire: 'سلك' } as const
const note = ref('')
watch(() => part.value?.id, () => { note.value = '' })
const rotate = () => {
  if (part.value) note.value = sb.rotate(part.value.id) ? '' : 'مفيش مكان يلف فيه هنا. حرّكه لمكان فاضي الأول.'
}
</script>

<template>
  <div class="card sb-inspector">
    <template v-if="part">
      <h3>{{ sb.labels.value[part.id] }} · {{ kindName[part.kind] }}</h3>
      <p v-if="reading && (part.kind === 'res' || part.kind === 'led')" class="sb-reading">
        التيار: <b>{{ (Math.abs(reading.current) * 1000).toFixed(1) }} mA</b> · الجهد عليها: <b>{{ Math.abs(reading.voltage).toFixed(2) }} V</b>
      </p>
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
        <button v-if="part.kind === 'led' && part.burned" class="btn pri" @click="sb.update(part.id, { burned: false, burnCurrent: undefined })">💡 LED جديد</button>
        <button v-if="part.kind === 'led'" class="btn" @click="sb.flip(part.id)">↩️ اقلبه</button>
        <button v-if="part.kind !== 'wire'" class="btn" @click="rotate">⟳ لفّه</button>
        <button class="btn" @click="sb.remove(part.id)">🗑️ شيله</button>
      </div>
      <p v-if="note" class="res st-warn">{{ note }}</p>
      <p class="sb-tip">حرّكه بالسحب. اسحبه برّه البورد عشان تشيله.</p>
    </template>
    <p v-else class="sb-tip">دوس على أي قطعة على البورد عشان تغيّر قيمتها أو لونها أو تلفها أو تشيلها. ودوس على أي خرم تقيس الجهد عليه.</p>
  </div>
</template>

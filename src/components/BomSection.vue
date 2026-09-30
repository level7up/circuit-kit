<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BomItem, BomRow } from '../types/circuit'
import { useCircuit } from '../composables/context'
import SectionHead from './SectionHead.vue'

defineProps<{ num: number }>()
const bom = useCircuit().bom!
const isItem = (r: BomRow): r is BomItem => !('g' in r)
const rows = ref<BomRow[]>(bom.rows.map(r => ({ ...r })))
const total = computed(() => rows.value.filter(isItem).filter(r => r.on && !r.car).reduce((s, r) => s + r.q * r.p, 0))
const toggle = (i: number) => {
  rows.value = rows.value.map((r, j) => (j === i && isItem(r) ? { ...r, on: r.on ? 0 : 1 } : r))
}
</script>

<template>
  <section id="bom">
    <SectionHead :num="num" :title="bom.title" :sub="bom.sub" />
    <div class="tablewrap">
      <table>
        <thead><tr><th style="width:40px" /><th>المكون</th><th>المواصفة / الاسم في السوق</th><th>العدد</th><th>سعر الوحدة</th><th>الإجمالي</th><th>لينك</th></tr></thead>
        <tbody>
          <template v-for="(r, i) in rows" :key="i">
            <tr v-if="!isItem(r)" class="grp"><td colspan="7">{{ r.g }}</td></tr>
            <tr v-else :class="{ off: !r.on }">
              <td><input type="checkbox" :checked="!!r.on" :disabled="!!r.car" @change="toggle(i)"></td>
              <td>{{ r.n }}</td>
              <td>{{ r.s }}<span v-if="r.est" class="est">تقديري</span></td>
              <td>{{ r.q }}</td>
              <td>{{ r.car ? '—' : r.p.toFixed(2) }}</td>
              <td>{{ r.car ? '—' : (r.q * r.p).toFixed(2) }}</td>
              <td><a v-if="r.u" :href="r.u" target="_blank" rel="noopener">فتح ↗</a><template v-else>—</template></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div class="totalbar">
      <div class="t">الإجمالي: <b>{{ total.toFixed(2) }}</b> جنيه</div>
      <div style="font-size:13px;color:var(--muted)" v-html="bom.footnote" />
    </div>
  </section>
</template>

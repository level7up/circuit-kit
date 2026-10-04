<script setup lang="ts">
import { computed } from 'vue'
import type { SimPreset } from '../types/circuit'
import { useSim } from '../composables/context'

const props = defineProps<{ presets: SimPreset<any>[] }>()
const sim = useSim()

const active = computed(() => props.presets.find(p => p.isActive(sim.params.value)) ?? null)
const toBuy = computed(() => active.value?.parts.filter(p => p.buy) ?? [])
const choose = (preset: SimPreset<any>) => sim.setParams(preset.apply(sim.base.value))
</script>

<template>
  <div class="card presets">
    <div class="pr-buttons" role="group" aria-label="شكل الرعشة">
      <button v-for="p in presets" :key="p.id" class="pr-btn" :class="{ on: active?.id === p.id }" @click="choose(p)">
        <span class="pr-icon">{{ p.icon }}</span>{{ p.name }}
      </button>
    </div>
    <template v-if="active">
      <p class="pr-desc">{{ active.desc }}</p>
      <div class="pr-parts">
        <div v-for="part in active.parts" :key="part.id" class="pr-part" :class="{ buy: part.buy }">
          <b>{{ part.id }}</b><span>{{ part.value }}</span>
        </div>
      </div>
      <div v-if="toBuy.length" class="pr-buy">
        <b>🛒 محتاج تشتري:</b>
        <ul>
          <li v-for="part in toBuy" :key="part.id"><b>{{ part.value }}</b> مكان {{ part.id }}<span v-if="part.note"> ({{ part.note }})</span></li>
        </ul>
        <p>غيّر القطع دي بس، والباقي زي ما هو. ولو هتلحم، اختار الشكل قبل اللحام.</p>
      </div>
      <p v-else class="pr-ok">✅ ده التصميم الأصلي: كل القطع موجودة في قائمة المكونات.</p>
    </template>
    <p v-else class="pr-desc">القيم دلوقتي متغيّرة بإيدك ومش مطابقة لأي شكل. دوس على شكل عشان ترجع لقيمه.</p>
  </div>
</template>

<style scoped>
.presets{padding:14px;margin-bottom:14px}
.pr-buttons{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.pr-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:.2s}
.pr-btn:hover{border-color:var(--amber)}
.pr-btn.on{background:var(--amber);color:#1a1206;border-color:var(--amber)}
.pr-icon{font-size:20px}
.pr-desc{margin:12px 0 8px;color:var(--muted);font-size:14px}
.pr-parts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:560px){.pr-parts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pr-part{display:flex;flex-direction:column;align-items:center;padding:8px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);font-size:14px}
.pr-part b{color:var(--muted);font-size:12px}
.pr-part span{direction:ltr;unicode-bidi:isolate;font-weight:800}
.pr-part.buy{border-color:var(--amber)}
.pr-part.buy span{color:var(--amber)}
.pr-buy{margin-top:12px;padding:10px 14px;border-radius:10px;background:#16120a;border:1px solid #5a4214;font-size:14px}
.pr-buy ul{margin:6px 0;padding-inline-start:20px}
.pr-buy li b{direction:ltr;unicode-bidi:isolate;color:var(--amber)}
.pr-buy p{margin:6px 0 0;color:var(--muted);font-size:13px}
.pr-ok{margin:12px 0 0;color:var(--green);font-size:14px}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useCircuit, useSim } from '../composables/context'

const PIECE_W = 150
const GAP = 26
const LED_W = 26
const H = 48
const TOP = 46
const POWER_ON = 1
const POWER_OFF = 0

const circuit = useCircuit()
const sim = useSim()
const def = circuit.stripPreview!
const width = def.pieces.length * PIECE_W + (def.pieces.length - 1) * GAP + 40
const color = computed(() => String(sim.params.value.lampGlow ?? '#eef5ff'))
const lit = computed(() => {
  void sim.frame.value
  return def.lit(sim.state(), sim.params.value)
})
const isOn = computed(() => (def.power ? def.power.get(sim.params.value) !== POWER_OFF : true))
const setPower = (v: number) => {
  if (def.power) sim.setParams(def.power.set(sim.base.value, v))
}
const pieceX = (i: number) => 20 + i * (PIECE_W + GAP)
const ledX = (i: number, k: number) => pieceX(i) + (PIECE_W * (2 * k + 1)) / (2 * def.ledsPerPiece)
</script>

<template>
  <div class="card strip-preview">
    <div class="sp-tools">
      <div v-if="def.power" class="seg" role="group" aria-label="الكهربا">
        <button :class="{ on: isOn }" @click="setPower(POWER_ON)">💡 شغّال</button>
        <button :class="{ on: !isOn }" @click="setPower(POWER_OFF)">مفصول</button>
      </div>
      <button class="btn" @click="sim.setRunning(!sim.running.value)">{{ sim.running.value ? '⏸ وقّف الوقت' : '▶ كمّل' }}</button>
    </div>
    <svg :viewBox="`0 0 ${width} 150`" role="img" aria-label="الشريط وهو بيجري">
      <rect x="0" y="0" :width="width" height="150" rx="12" fill="#070b16" />
      <g v-for="(phase, i) in def.pieces" :key="i">
        <text :x="pieceX(i) + PIECE_W / 2" y="30" class="sp-num">حتة {{ i + 1 }} · {{ phase }}</text>
        <rect :x="pieceX(i)" :y="TOP" :width="PIECE_W" :height="H" rx="4" fill="#ece7d6" stroke="#b8b2a0" />
        <g v-for="k in def.ledsPerPiece" :key="k">
          <circle :cx="ledX(i, k - 1)" :cy="TOP + H / 2" r="26" :fill="color" :opacity="lit[i] ? 0.55 : 0" class="sp-halo" />
          <rect :x="ledX(i, k - 1) - LED_W / 2" :y="TOP + H / 2 - 9" :width="LED_W" height="18" rx="3" :fill="lit[i] ? color : '#7d7868'" stroke="#5c584b" />
        </g>
        <text :x="pieceX(i) + PIECE_W / 2" :y="TOP + H + 30" class="sp-state" :class="{ on: lit[i] }">{{ lit[i] ? 'منوّرة' : 'مطفية' }}</text>
      </g>
    </svg>
    <p class="sp-note" v-html="def.note" />
  </div>
</template>

<style scoped>
.strip-preview{padding:14px}
.sp-tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;align-items:center}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.seg button{background:var(--panel2);color:var(--text);border:0;padding:7px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.seg button.on{background:var(--amber);color:#1a1206;font-weight:700}
svg{width:100%;height:auto;display:block;border-radius:12px;direction:ltr}
.sp-num{font:800 14px system-ui;fill:#cbd5ea;text-anchor:middle}
.sp-state{font:700 12px system-ui;fill:#6b7488;text-anchor:middle}
.sp-state.on{fill:#ffb547}
.sp-halo{filter:blur(8px)}
.sp-note{margin:8px 0 0;font-size:13px;color:var(--muted)}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCircuit, useSim } from '../composables/context'

type Sides = 'both' | 'left'

const MIN_GLOW = 0.04
const STEADY = 1
const DEFAULT_GLOW = '#fff1c4'

const DEFAULT_PLATE = 'رعشة 12V'
const DEFAULT_TAG = 'بترعش'
const DEFAULT_NOTE = 'ده نفس المحاكي بتاع الدايرة. أي حاجة تغيّرها في تبويب <b>البريد بورد</b> أو <b>المحاكي</b> (قيمة مقاومة، لمبة تانية، لمبتين، شيل قطعة) هتبان هنا على العربية على طول.'
const POWER_OFF = 0
const POWER_ON = 1
const POWER_AUTO = 2
const RING_R = 25
const HEADLIGHTS = [245, 555]

const circuit = useCircuit()
const sim = useSim()
const face = circuit.carFace
const isRing = face?.look === 'ring'
const power = face?.power
const localOn = ref(true)
const powerLevel = computed(() => (power ? power.get(sim.params.value) : localOn.value ? POWER_ON : POWER_OFF))
const setPower = (v: number) => {
  if (power) sim.setParams(power.set(sim.base.value, v))
  else localOn.value = v !== POWER_OFF
}
const lightsOn = computed(() => powerLevel.value !== POWER_OFF)
const sides = ref<Sides>('both')
const night = ref(true)

const color = computed(() => circuit.board?.dynamics.glowColor(sim.params.value) ?? String(sim.params.value.lampGlow ?? DEFAULT_GLOW))
const floor = power ? 0 : MIN_GLOW
const flicker = computed(() => (lightsOn.value ? floor + (1 - floor) * sim.brightness.value : 0))
const leftLevel = computed(() => flicker.value)
const rightLevel = computed(() => (!lightsOn.value ? 0 : sides.value === 'both' ? flicker.value : STEADY))
const percent = computed(() => Math.round(sim.brightness.value * 100))
const lampName = computed(() => String(sim.params.value.lampName ?? 'T10'))

const lamp = (level: number) => ({ opacity: level.toFixed(3) })
const halo = (level: number) => ({ opacity: (level * 0.85).toFixed(3) })
</script>

<template>
  <div class="card carface" :class="{ day: !night }">
    <div class="cf-tools">
      <div class="seg" role="group" aria-label="أنوار الركن">
        <button :class="{ on: powerLevel === POWER_ON }" @click="setPower(POWER_ON)">💡 أنوار الركن شغالة</button>
        <button :class="{ on: powerLevel === POWER_OFF }" @click="setPower(POWER_OFF)">مطفية</button>
        <button v-if="power" :class="{ on: powerLevel === POWER_AUTO }" @click="setPower(POWER_AUTO)">🔁 تلقائي</button>
      </div>
      <div v-if="!isRing" class="seg" role="group" aria-label="الجنبين">
        <button :class="{ on: sides === 'both' }" @click="sides = 'both'">الجنبين بيرعشوا</button>
        <button :class="{ on: sides === 'left' }" @click="sides = 'left'">جنب واحد بس</button>
      </div>
      <div class="seg" role="group" aria-label="الوقت">
        <button :class="{ on: night }" @click="night = true">🌙 بالليل</button>
        <button :class="{ on: !night }" @click="night = false">☀️ بالنهار</button>
      </div>
      <button class="btn" @click="sim.setRunning(!sim.running.value)">{{ sim.running.value ? '⏸ إيقاف' : '▶ تشغيل' }}</button>
    </div>

    <svg viewBox="0 0 800 430" role="img" aria-label="وش العربية وأنوار الركن بترعش">
      <defs>
        <linearGradient id="cfSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="night ? '#070b16' : '#9cc9f0'" />
          <stop offset="1" :stop-color="night ? '#141b2e' : '#dbeaf6'" />
        </linearGradient>
        <linearGradient id="cfBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5b6578" />
          <stop offset=".55" stop-color="#3a4252" />
          <stop offset="1" stop-color="#232833" />
        </linearGradient>
        <linearGradient id="cfGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fb4cf" stop-opacity=".55" />
          <stop offset="1" stop-color="#1c2433" stop-opacity=".9" />
        </linearGradient>
        <radialGradient id="cfGlow">
          <stop offset="0" :stop-color="color" stop-opacity="1" />
          <stop offset=".35" :stop-color="color" stop-opacity=".55" />
          <stop offset="1" :stop-color="color" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="cfPool">
          <stop offset="0" :stop-color="color" stop-opacity=".5" />
          <stop offset="1" :stop-color="color" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="430" fill="url(#cfSky)" />
      <rect y="360" width="800" height="70" :fill="night ? '#0c0f17' : '#8d9198'" />

      <ellipse cx="215" cy="385" rx="120" ry="20" fill="url(#cfPool)" :style="halo(isRing ? leftLevel * 0.5 : leftLevel)" />
      <ellipse cx="585" cy="385" rx="120" ry="20" fill="url(#cfPool)" :style="halo(isRing ? rightLevel * 0.5 : rightLevel)" />

      <path d="M210 120 Q230 70 300 62 L500 62 Q570 70 590 120 Z" fill="url(#cfGlass)" stroke="#1b202a" stroke-width="4" />
      <path d="M120 200 Q130 132 210 120 L590 120 Q670 132 680 200 L700 300 Q700 345 660 350 L140 350 Q100 345 100 300 Z" fill="url(#cfBody)" stroke="#1b202a" stroke-width="4" />
      <path d="M150 128 L650 128" stroke="#7b8598" stroke-width="2" opacity=".5" />
      <rect x="110" y="345" width="70" height="30" rx="8" fill="#15181f" />
      <rect x="620" y="345" width="70" height="30" rx="8" fill="#15181f" />

      <path d="M128 185 Q140 160 175 156 L300 160 Q310 190 290 208 L150 214 Q126 210 128 185 Z" fill="#1a1f29" stroke="#0e1117" stroke-width="3" />
      <path d="M672 185 Q660 160 625 156 L500 160 Q490 190 510 208 L650 214 Q674 210 672 185 Z" fill="#1a1f29" stroke="#0e1117" stroke-width="3" />
      <circle cx="245" cy="186" r="20" fill="#2a3242" stroke="#566179" stroke-width="2" />
      <circle cx="555" cy="186" r="20" fill="#2a3242" stroke="#566179" stroke-width="2" />

      <g v-if="isRing">
        <g v-for="cx in HEADLIGHTS" :key="cx">
          <circle :cx="cx" cy="186" :r="RING_R * 2.6" fill="url(#cfGlow)" :style="halo(leftLevel * 0.6)" />
          <circle :cx="cx" cy="186" :r="RING_R" fill="none" :stroke="color" stroke-width="12" class="cf-ring-halo" :style="halo(leftLevel)" />
          <circle :cx="cx" cy="186" :r="RING_R" fill="none" stroke="#3a4252" stroke-width="5" />
          <circle :cx="cx" cy="186" :r="RING_R" fill="none" :stroke="color" stroke-width="4" :style="lamp(leftLevel)" />
        </g>
      </g>
      <template v-else>
        <circle cx="173" cy="187" r="70" fill="url(#cfGlow)" :style="halo(leftLevel)" />
        <rect x="153" y="180" width="40" height="14" rx="7" :fill="color" :style="lamp(leftLevel)" />
        <rect x="153" y="180" width="40" height="14" rx="7" fill="none" stroke="#6b7488" stroke-width="2" />
        <circle cx="627" cy="187" r="70" fill="url(#cfGlow)" :style="halo(rightLevel)" />
        <rect x="607" y="180" width="40" height="14" rx="7" :fill="color" :style="lamp(rightLevel)" />
        <rect x="607" y="180" width="40" height="14" rx="7" fill="none" stroke="#6b7488" stroke-width="2" />
      </template>

      <rect x="330" y="170" width="140" height="62" rx="14" fill="#14171e" stroke="#4a5263" stroke-width="3" />
      <path v-for="i in 5" :key="i" :d="`M340 ${172 + i * 10} L460 ${172 + i * 10}`" stroke="#2d3340" stroke-width="3" />
      <circle cx="400" cy="200" r="12" fill="#c9d1dc" stroke="#7d8696" stroke-width="2" />
      <rect x="230" y="262" width="340" height="40" rx="12" fill="#1c212b" />
      <rect x="350" y="300" width="100" height="32" rx="4" fill="#f2f2ee" stroke="#9a9a92" stroke-width="2" />
      <text x="400" y="322" class="cf-plate">{{ face?.plate ?? DEFAULT_PLATE }}</text>
      <text :x="isRing ? 245 : 173" y="240" class="cf-tag">{{ face?.tag ?? DEFAULT_TAG }}</text>
      <text :x="isRing ? 555 : 627" y="240" class="cf-tag">{{ isRing || sides === 'both' ? face?.tag ?? DEFAULT_TAG : 'ثابتة (أصلية)' }}</text>
    </svg>

    <div class="cf-read">
      <span>السطوع دلوقتي: <b>{{ lightsOn ? percent + '%' : 'مطفية' }}</b></span>
      <span>اللمبة: <b>{{ lampName }}</b></span>
    </div>
    <p class="cf-note" v-html="face?.note ?? DEFAULT_NOTE" />
  </div>
</template>

<style scoped>
.carface{padding:14px}
.cf-tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;align-items:center}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.seg button{background:var(--panel2);color:var(--text);border:0;padding:7px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.seg button.on{background:var(--amber);color:#1a1206;font-weight:700}
svg{width:100%;height:auto;display:block;border-radius:12px}
.cf-plate{font:800 15px system-ui;fill:#222;text-anchor:middle}
.cf-ring-halo{filter:blur(5px)}
.cf-tag{font:700 13px system-ui;fill:#c9d1dc;text-anchor:middle;opacity:.8}
.day .cf-ring-halo{filter:blur(5px)}
.cf-tag{fill:#1b2333}
.cf-read{display:flex;flex-wrap:wrap;gap:18px;margin-top:10px;font-size:14px;color:var(--muted)}
.cf-read b{color:var(--amber)}
.cf-note{margin:8px 0 0;font-size:13px;color:var(--muted)}
</style>

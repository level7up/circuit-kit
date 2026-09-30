<script setup lang="ts">
import { computed, nextTick, provide, ref } from 'vue'
import { HOME_HREF, type AnyCircuit } from '../circuits'
import { CircuitKey, GuideKey, SimKey } from '../composables/context'
import { useSimulation } from '../composables/useSimulation'
import NavBar from './NavBar.vue'
import HeroSection from './HeroSection.vue'
import OverviewSection from './OverviewSection.vue'
import SchematicSection from './SchematicSection.vue'
import BreadboardSection from './board/BreadboardSection.vue'
import SimulatorSection from './SimulatorSection.vue'
import PinoutsSection from './PinoutsSection.vue'
import BomSection from './BomSection.vue'
import StepsSection from './StepsSection.vue'
import WiringSection from './WiringSection.vue'
import CarSection from './CarSection.vue'
import TroubleSection from './TroubleSection.vue'

const props = defineProps<{ circuit: AnyCircuit }>()
const circuit = props.circuit
document.title = circuit.title + ' – الدليل الكامل'

const dynamics = circuit.board?.dynamics
const board = circuit.board
const sim = useSimulation(
  circuit.sim,
  dynamics ? (current, next) => dynamics.withLampMode(next, dynamics.lampMode(current)) : undefined,
  board ? (p, removed) => board.removal.apply(p, removed) : undefined
)
const step = ref(0)
const openStep = (index: number) => {
  step.value = index
  nextTick(() => document.getElementById('steps')?.scrollIntoView({ behavior: 'smooth' }))
}

provide(CircuitKey, circuit)
provide(SimKey, sim)
provide(GuideKey, { step, openStep })

const sections = computed(() => [
  { id: 'overview', label: 'الفكرة', on: !!circuit.overview, comp: OverviewSection },
  { id: 'schematic', label: 'رسمة الدايرة', on: !!circuit.schematic, comp: SchematicSection },
  { id: 'board', label: 'البريد بورد', on: !!circuit.board, comp: BreadboardSection },
  { id: 'sim', label: 'المحاكي', on: true, comp: SimulatorSection },
  { id: 'pinouts', label: 'الرجول والقطبية', on: !!circuit.pinouts, comp: PinoutsSection },
  { id: 'bom', label: 'المكونات والتكلفة', on: !!circuit.bom, comp: BomSection },
  { id: 'steps', label: 'خطوات التنفيذ', on: !!circuit.steps, comp: StepsSection },
  { id: 'wiring', label: 'قائمة التوصيلات', on: !!circuit.wiring, comp: WiringSection },
  { id: 'car', label: 'التركيب في العربية', on: !!circuit.car, comp: CarSection },
  { id: 'trouble', label: 'الأعطال', on: !!circuit.trouble, comp: TroubleSection }
].filter(s => s.on))
</script>

<template>
  <a class="homelink" :href="HOME_HREF">← كل الدواير</a>
  <HeroSection />
  <NavBar :items="sections" />
  <main class="wrap">
    <component :is="s.comp" v-for="(s, i) in sections" :key="s.id" :num="i + 1" />
  </main>
  <footer>{{ circuit.footer }}</footer>
</template>

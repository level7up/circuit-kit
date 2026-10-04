<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, provide, ref, type Component } from 'vue'
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
import AssemblySection from './AssemblySection.vue'
import CarSection from './CarSection.vue'
import TroubleSection from './TroubleSection.vue'

interface Tab {
  id: string
  label: string
  comp: Component
}

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

const candidates: (Tab & { on: boolean })[] = [
  { id: 'overview', label: 'الفكرة', on: !!circuit.overview, comp: OverviewSection },
  { id: 'schematic', label: 'رسمة الدايرة', on: !!circuit.schematic, comp: SchematicSection },
  { id: 'board', label: 'البريد بورد', on: !!circuit.board, comp: BreadboardSection },
  { id: 'sim', label: 'المحاكي', on: true, comp: SimulatorSection },
  { id: 'pinouts', label: 'الرجول والقطبية', on: !!circuit.pinouts, comp: PinoutsSection },
  { id: 'bom', label: 'المكونات والتكلفة', on: !!circuit.bom, comp: BomSection },
  { id: 'steps', label: 'خطوات التنفيذ', on: !!circuit.steps, comp: StepsSection },
  { id: 'wiring', label: 'قائمة التوصيلات', on: !!circuit.wiring, comp: WiringSection },
  { id: 'assembly', label: 'التجميع على البورد', on: !!circuit.assembly, comp: AssemblySection },
  { id: 'car', label: 'التركيب في العربية', on: !!circuit.car, comp: CarSection },
  { id: 'trouble', label: 'الأعطال', on: !!circuit.trouble, comp: TroubleSection }
]
const tabs: Tab[] = candidates.filter(t => t.on).map(({ id, label, comp }) => ({ id, label, comp: markRaw(comp) }))

const tabFromHash = (): string => {
  const id = decodeURIComponent(location.hash.slice(1))
  return tabs.some(t => t.id === id) ? id : tabs[0].id
}
const tab = ref(tabFromHash())
const index = computed(() => tabs.findIndex(t => t.id === tab.value))
const current = computed(() => tabs[index.value])
const prev = computed(() => tabs[index.value - 1])
const next = computed(() => tabs[index.value + 1])

const onHashChange = () => {
  tab.value = tabFromHash()
  window.scrollTo({ top: 0 })
}
onMounted(() => window.addEventListener('hashchange', onHashChange))
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange))

const openTab = (id: string) => {
  if (location.hash === '#' + id) return onHashChange()
  location.hash = id
}

const step = ref(0)
const openStep = (i: number) => {
  step.value = i
  openTab('steps')
  nextTick(() => window.scrollTo({ top: 0 }))
}

provide(CircuitKey, circuit)
provide(SimKey, sim)
provide(GuideKey, { step, openStep, tab, openTab })
</script>

<template>
  <a class="homelink" :href="HOME_HREF">← كل الدواير</a>
  <HeroSection v-if="index === 0" />
  <div v-else class="wrap guide-title">
    <span class="tag">{{ circuit.hero.tag }}</span>
    <h1>{{ circuit.title }}</h1>
  </div>
  <NavBar :items="tabs" :active="tab" />
  <main class="wrap" role="tabpanel" :aria-label="current.label">
    <KeepAlive>
      <component :is="current.comp" :key="current.id" :num="index + 1" />
    </KeepAlive>
    <nav class="tabpager" aria-label="التنقل بين الأجزاء">
      <a v-if="prev" class="btn" :href="'#' + prev.id">→ {{ prev.label }}</a><span v-else />
      <a v-if="next" class="btn pri" :href="'#' + next.id">{{ next.label }} ←</a>
    </nav>
  </main>
  <footer>{{ circuit.footer }}</footer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { HOME_HREF } from '../../circuits'
import { EXAMPLES, PALETTE, SUPPLIES, type PaletteItem } from '../../lab/sandbox-content'
import { useSandbox } from '../../composables/useSandbox'
import { canPlace, occupied, orientationOf, secondHole, type Orientation } from '../../lib/sandbox/placement'
import type { SandboxKind, SandboxPart } from '../../lib/sandbox/solver'
import { stripOf } from '../../lib/breadboard/geometry'
import SandboxBoard, { type Ghost } from './SandboxBoard.vue'
import SandboxInspector from './SandboxInspector.vue'

const CLICK_SLOP_PX = 5

document.title = 'المعمل الحر – ركّب دايرتك'

const sb = useSandbox()
const board = ref<InstanceType<typeof SandboxBoard> | null>(null)
const wireMode = ref(false)
const wireStart = ref<string | null>(null)
const probe = ref<string | null>(null)
const ghost = ref<Ghost | null>(null)

interface Drag {
  kind: Exclude<SandboxKind, 'wire'>
  orient: Orientation
  props: Partial<SandboxPart>
  moveId?: string
  x0: number
  y0: number
  moved: boolean
  lastX: number
  lastY: number
}
const drag = ref<Drag | null>(null)

function candidate(d: Drag, clientX: number, clientY: number): Ghost | null {
  const a = board.value?.holeAt(clientX, clientY)
  if (!a) return null
  const b = secondHole(a, d.kind, d.orient)
  const part: SandboxPart = { id: 'ghost', kind: d.kind, a, b: b ?? a, ...d.props }
  return { part, valid: canPlace(a, b, occupied(sb.parts.value, d.moveId)) }
}

function startNew(item: PaletteItem, e: PointerEvent) {
  e.preventDefault()
  wireMode.value = false
  drag.value = { kind: item.kind, orient: 'h', props: { ...item.defaults }, x0: e.clientX, y0: e.clientY, moved: true, lastX: e.clientX, lastY: e.clientY }
}

function startMove(id: string, e: PointerEvent) {
  const p = sb.parts.value.find(x => x.id === id)
  if (!p) return
  e.preventDefault()
  if (p.kind === 'wire') { drag.value = null; sb.selected.value = id; return }
  const { kind, a: _a, b: _b, id: _id, ...rest } = p
  drag.value = { kind, orient: orientationOf(p), props: rest, moveId: id, x0: e.clientX, y0: e.clientY, moved: false, lastX: e.clientX, lastY: e.clientY }
}

function onMove(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  d.lastX = e.clientX
  d.lastY = e.clientY
  if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > CLICK_SLOP_PX) d.moved = true
  ghost.value = d.moved ? candidate(d, e.clientX, e.clientY) : null
}

function onUp(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  drag.value = null
  const g = ghost.value
  ghost.value = null
  if (d.moveId && !d.moved) {
    sb.selected.value = d.moveId
    return
  }
  if (g?.valid) {
    const placed = { kind: d.kind, a: g.part.a, b: g.part.b, ...d.props }
    if (d.moveId) { sb.update(d.moveId, { a: placed.a, b: placed.b }); sb.selected.value = d.moveId }
    else sb.selected.value = sb.add(placed)
    return
  }
  if (d.moveId && !board.value?.insideBoard(e.clientX, e.clientY)) sb.remove(d.moveId)
}

function onKey(e: KeyboardEvent) {
  const d = drag.value
  if (d && (e.key === 'r' || e.key === 'R' || e.key === 'ر')) {
    d.orient = d.orient === 'h' ? 'v' : 'h'
    ghost.value = candidate(d, d.lastX, d.lastY)
  }
  if (!d && (e.key === 'Delete' || e.key === 'Backspace') && sb.selected.value && !(e.target instanceof HTMLSelectElement)) sb.remove(sb.selected.value)
  if (e.key === 'Escape') { drag.value = null; ghost.value = null; wireStart.value = null; wireMode.value = false }
}

onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('keydown', onKey)
})

function onHole(hole: string) {
  if (!wireMode.value) {
    probe.value = hole
    sb.selected.value = null
    return
  }
  if (!wireStart.value) { wireStart.value = hole; return }
  if (canPlace(wireStart.value, hole, occupied(sb.parts.value))) sb.selected.value = sb.add({ kind: 'wire', a: wireStart.value, b: hole })
  wireStart.value = null
}

const toggleWire = () => { wireMode.value = !wireMode.value; wireStart.value = null }
const probeVoltage = () => (probe.value ? sb.result.value.voltage(stripOf(probe.value)) : null)
</script>

<template>
  <a class="homelink" :href="HOME_HREF">← الصفحة الرئيسية</a>
  <div class="wrap guide-title">
    <span class="tag">🧪 المعمل الحر</span>
    <h1>ركّب دايرتك بنفسك وشوفها بتشتغل</h1>
  </div>
  <main class="wrap lab">
    <div class="sb-toolbar card">
      <div class="sb-palette" aria-label="صندوق القطع">
        <button v-for="item in PALETTE" :key="item.kind" class="sb-item" :title="item.hint" @pointerdown="startNew(item, $event)">
          <span class="sb-item-icon">{{ item.icon }}</span>{{ item.label }}
        </button>
        <button class="sb-item" :class="{ on: wireMode }" title="دوس على خرم، وبعدين على خرم تاني" @click="toggleWire"><span class="sb-item-icon">✏️</span>سلك</button>
      </div>
      <div class="sb-controls">
        <label>⚡ المصدر
          <select v-model.number="sb.supply.value">
            <option v-for="v in SUPPLIES" :key="v" :value="v">{{ v ? v + 'V' : 'مطفي' }}</option>
          </select>
        </label>
        <button v-for="ex in EXAMPLES" :key="ex.key" class="btn" @click="sb.loadExample(ex.key)">{{ ex.label }}</button>
        <button class="btn" @click="sb.clear()">🧹 فضّي البورد</button>
      </div>
      <p class="sb-help">
        <template v-if="drag">🔄 اضغط <kbd>R</kbd> عشان تلف القطعة وانت بتسحبها. الأخضر = مكان ينفع، الأحمر = مش هينفع.</template>
        <template v-else-if="wireMode">✏️ {{ wireStart ? 'دوس على الخرم التاني.' : 'دوس على أول خرم للسلك.' }} <kbd>Esc</kbd> للخروج.</template>
        <template v-else>👆 اسحب قطعة من هنا وسيبها على البورد. الخطوط الحمرا = +، والزرقا = −.</template>
      </p>
    </div>
    <SandboxBoard ref="board" :parts="sb.parts.value" :result="sb.result.value" :selected="sb.selected.value" :ghost="ghost" :wire-start="wireStart" :probe="probe" :labels="sb.labels.value"
      @part-down="startMove" @hole="onHole" @background="sb.selected.value = null" />
    <div class="sb-under">
      <div class="card sb-messages" aria-live="polite">
        <h3>🧠 الدايرة بتقول إيه؟</h3>
        <p v-if="probe" class="sb-probe">🔎 الخرم <code>{{ probe }}</code>: <b>{{ probeVoltage() === null ? 'مش متوصل بحاجة' : probeVoltage()!.toFixed(2) + ' V' }}</b></p>
        <div v-for="(m, i) in sb.messages.value" :key="i" class="res" :class="'st-' + (m.st === 'info' ? 'ok' : m.st)">{{ m.text }}</div>
      </div>
      <SandboxInspector :sandbox="sb" />
    </div>
  </main>
  <footer>معمل الدواير · أدلة تعليمية تفاعلية</footer>
</template>

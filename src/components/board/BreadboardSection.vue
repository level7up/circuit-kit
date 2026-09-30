<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCircuit, useGuide, useSim } from '../../composables/context'
import { focusFor, stripNetMap, visibleParts, type Selection } from '../../lib/breadboard/logic'
import { isRail } from '../../lib/breadboard/geometry'
import SectionHead from '../SectionHead.vue'
import BoardSvg from './BoardSvg.vue'
import BoardInfo from './BoardInfo.vue'
import PartDictionary from './PartDictionary.vue'
import PartPopover from './PartPopover.vue'
import type { BoardPart } from '../../types/circuit'

defineProps<{ num: number }>()
const board = useCircuit().board!
const sim = useSim()
const guide = useGuide()
const dyn = board.dynamics

const stage = ref(0)
const selection = ref<Selection>(null)
const popover = ref<{ id: string; x: number; y: number; width: number } | null>(null)
const easy = ref(true)
const showLabels = ref(true)
const boardView = ref<InstanceType<typeof BoardSvg> | null>(null)

const lampMode = computed(() => dyn.lampMode(sim.params.value))
const removedSet = computed(() => new Set(sim.removed.value))
const swapHidden = computed(() => dyn.hidden(sim.params.value))
const hidden = computed(() => new Set([...swapHidden.value, ...removedSet.value]))
const modeParts = computed(() => board.parts.filter(p => !p.mode || p.mode === lampMode.value))
const visible = computed(() => visibleParts(board.parts, stage.value, lampMode.value, hidden.value))
const visibleIds = computed(() => new Set(visible.value.map(p => p.id)))
const strips = computed(() => stripNetMap(visible.value))
const activeSelection = computed<Selection>(() => {
  const sel = selection.value
  if (sel?.kind !== 'part') return sel
  return visibleIds.value.has(sel.id) || hidden.value.has(sel.id) ? sel : null
})
const focus = computed(() => focusFor(activeSelection.value, board.parts, visible.value, strips.value))
const selectedId = computed(() => (activeSelection.value?.kind === 'part' ? activeSelection.value.id : ''))
const newIds = computed(() => (stage.value && !activeSelection.value ? visible.value.filter(p => p.s === stage.value).map(p => p.id) : []))
const stageInfo = computed(() => board.stages.find(s => s.s === stage.value))
const otherLamp = computed(() => board.lampModes.find(m => m.key !== lampMode.value))
const activeSwaps = computed(() => Object.entries(sim.swaps.value).map(([key, i]) => ({ key, icon: board.edu[key]?.ic ?? '', text: board.alternatives[key][i].t })))
const ghosts = computed(() => new Set(modeParts.value.filter(p => removedSet.value.has(p.id) && (stage.value === 0 || p.s <= stage.value)).map(p => p.id)))

const setLamp = (mode: string) => sim.setParams(dyn.withLampMode(sim.base.value, mode))
const setStage = (s: number) => {
  closePopover()
  stage.value = s
  selection.value = null
  setLamp(dyn.lampModeForStage(s))
}
const selectPart = (id: string, at?: { x: number; y: number; width: number }) => {
  const sel = selection.value
  const same = sel?.kind === 'part' && sel.id === id
  selection.value = same ? null : { kind: 'part', id }
  popover.value = !same && at ? { id, ...at } : null
}
const popoverPart = computed(() => (popover.value ? board.parts.find(p => p.id === popover.value?.id) : undefined))
const closePopover = () => { popover.value = null }
const clearSelection = () => { selection.value = null; closePopover() }
const showDetails = () => {
  closePopover()
  nextTick(() => document.getElementById('bbInfo')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
const selectNet = (net: string) => {
  closePopover()
  const sel = selection.value
  selection.value = sel?.kind === 'net' && sel.net === net ? null : { kind: 'net', net }
}
const selectStrip = (strip: string) => {
  closePopover()
  const net = strips.value[strip]
  if (net) return selectNet(net)
  selection.value = { kind: 'strip', strip }
}
const choose = (key: string, index: number) => sim.setSwap(key, index, board.alternatives)
const showPart = (id: string) => {
  const part = board.parts.find(p => p.id === id)
  if (!part) return
  if (stage.value && part.s > stage.value) setStage(0)
  if (part.mode && part.mode !== lampMode.value) setLamp(part.mode)
  selection.value = { kind: 'part', id }
  nextTick(() => boardView.value?.wrap?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
const chooseFromDictionary = (key: string, index: number, partId: string) => { choose(key, index); showPart(partId) }
const toggleFullscreen = () => {
  const el = boardView.value?.wrap
  if (document.fullscreenElement) document.exitFullscreen()
  else el?.requestFullscreen?.()
}

const partName = (p: BoardPart): string => {
  const net = p.pins[0]?.[1] ?? ''
  if (easy.value) {
    const e = board.edu[board.eduOf[p.id] ?? board.eduFallback]
    return `${e.ic} ${p.k === 'jumper' ? 'سلك ' + board.wireNames[net] : p.lab ?? p.id} · ${e.short}`
  }
  if (p.k === 'jumper') return 'سلك ' + board.wireNames[net] + ' · ' + (board.nets[net]?.n ?? net)
  return board.partInfo[p.info ?? p.id]?.n ?? p.lab ?? p.id
}
const stripName = (s: string) => (isRail(s) ? board.railNames[s] : 'عمود ' + s.slice(1) + (s[0] === 'T' ? ' فوق (a–e)' : ' تحت (f–j)'))
const tooltip = ({ part, strip }: { part?: string; strip?: string }): string => {
  const p = part ? board.parts.find(x => x.id === part) : undefined
  if (p) return partName(p)
  if (!strip) return ''
  const net = strips.value[strip]
  return stripName(strip) + ' · ' + (net ? board.nets[net]?.n ?? net : 'فاضي')
}

setLamp(dyn.lampModeForStage(0))
</script>

<template>
  <section id="board">
    <SectionHead :num="num" :title="board.title" :sub="board.sub" />
    <div id="bbMode" class="bbmode" role="group" aria-label="نوع الشرح">
      <button :class="{ on: easy }" @click="easy = true">🔰 شرح للمبتدئين</button>
      <button :class="{ on: !easy }" @click="easy = false">🔧 شرح فني</button>
    </div>
    <div id="bbStages">
      <button v-for="s in board.stages" :key="s.s" class="btn" :class="{ pri: s.s === stage }" @click="setStage(s.s)">{{ s.b }}</button>
    </div>
    <div id="bbStageNote" class="flagnote">
      {{ stageInfo?.d }}
      <button v-if="stageInfo?.step !== undefined" class="btn" @click="guide.openStep(stageInfo.step)">📋 افتح الخطوة {{ stageInfo.step + 1 }} بالتفصيل</button>
    </div>
    <div v-if="activeSwaps.length || sim.removed.value.length" id="bbSwapBar" class="flagnote swapbar">
      <b>🔁 تغييرات شغالة دلوقتي:</b>
      <button v-for="s in activeSwaps" :key="s.key" class="chip" @click="choose(s.key, 0)">{{ s.icon }} {{ s.text }} ✖</button>
      <button v-for="id in sim.removed.value" :key="'rm-' + id" class="chip" @click="sim.toggleRemoved(id)">🗑️ {{ id }} متشالة ✖</button>
      <button class="btn" @click="sim.resetAll()">↺ رجّع كله للأصلي</button>
    </div>
    <BoardSvg ref="boardView" :board="board" :params="sim.params.value" :parts="modeParts" :visible="visibleIds" :ghosts="ghosts" :focus="focus.focus" :highlights="focus.highlights"
      :outline-ids="selectedId ? [selectedId] : newIds" :outline-kind="selectedId ? 'sel' : 'new'" :brightness="sim.brightness.value" :show-labels="showLabels" :tooltip="tooltip"
      @part="selectPart" @strip="selectStrip" @clear="clearSelection">
      <PartPopover v-if="popover && popoverPart" :key="popover.id" :board="board" :part="popoverPart" :easy="easy" :swaps="sim.swaps.value" :removed="removedSet.has(popover.id)"
        :x="popover.x" :y="popover.y" :area-width="popover.width" @close="closePopover" @choose="choose" @toggle-removed="sim.toggleRemoved" @details="showDetails" />
    </BoardSvg>
    <div class="bbunder">
      <div>
        <div id="bbNets" class="bbnets">
          <span class="bbnl">تتبّع خط:</span>
          <button v-for="n in board.netChips" :key="n" class="chip" :class="{ on: activeSelection?.kind === 'net' && activeSelection.net === n }" @click="selectNet(n)">
            <i :style="{ background: board.nets[n].c }" />{{ board.nets[n].n }}
          </button>
        </div>
        <div class="bbtools">
          <button v-if="otherLamp" class="btn" @click="setLamp(otherLamp.key)">{{ otherLamp.switchLabel }}</button>
          <button class="btn" @click="showLabels = !showLabels">🏷️ {{ showLabels ? 'إخفاء' : 'إظهار' }} الأسماء</button>
          <button class="btn" @click="toggleFullscreen">⛶ ملء الشاشة</button>
          <button class="btn" @click="clearSelection">✖ إلغاء التحديد</button>
        </div>
        <div class="flagnote" style="margin-top:12px" v-html="board.readingGuide" />
      </div>
      <BoardInfo :board="board" :easy="easy" :selection="activeSelection" :visible="visible" :strips="strips" :swaps="sim.swaps.value" :removed="removedSet" @choose="choose" @toggle-removed="sim.toggleRemoved" />
    </div>
    <h3 class="bbh3">🔰 أساسيات في دقيقة (لو أول مرة)</h3>
    <div class="bbbasics">
      <div v-for="c in board.basics" :key="c.title" class="card"><h4>{{ c.title }}</h4><span v-html="c.body" /></div>
    </div>
    <h3 class="bbh3">📚 قاموس القطع: كل قطعة بتعمل إيه، وبديلها لو مش لاقيها</h3>
    <p class="sub" style="margin-bottom:12px">دوس على أي كارت وهيوريك القطعة على البورد، أو اختار بديل وشوف النتيجة.</p>
    <PartDictionary :board="board" :swaps="sim.swaps.value" @show="showPart" @choose="chooseFromDictionary" />
  </section>
</template>

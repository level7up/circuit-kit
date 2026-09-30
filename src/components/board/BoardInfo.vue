<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnyBoard, BoardPart } from '../../types/circuit'
import { isRail } from '../../lib/breadboard/geometry'
import { pinsOnNet, touchesNet, type Selection } from '../../lib/breadboard/logic'
import { useSim } from '../../composables/context'
import AltOptions from './AltOptions.vue'
import ScopeCanvas from '../ScopeCanvas.vue'

const METER_REFRESH_MS = 120

const props = defineProps<{
  board: AnyBoard
  easy: boolean
  selection: Selection
  visible: BoardPart[]
  strips: Record<string, string>
  swaps: Record<string, number>
  removed: Set<string>
}>()
const emit = defineEmits<{ choose: [key: string, index: number]; toggleRemoved: [id: string] }>()
const STATUS_ICON = { ok: '✅', warn: '⚠️', bad: '⛔' } as const
const sim = useSim()

const part = computed(() => {
  const sel = props.selection
  return sel?.kind === 'part' ? props.board.parts.find(p => p.id === sel.id) : undefined
})
const isRemoved = computed(() => !!part.value && props.removed.has(part.value.id))
const removalEffect = computed(() => (part.value ? props.board.removal.effects[part.value.id] : undefined))
const eduKey = computed(() => (part.value ? props.board.eduOf[part.value.id] ?? props.board.eduFallback : ''))
const edu = computed(() => props.board.edu[eduKey.value])
const tech = computed(() => {
  const p = part.value
  if (!p) return null
  if (p.k !== 'jumper') return props.board.partInfo[p.info ?? p.id]
  const net = p.pins[0][1]
  return { n: 'سلك جمبر ' + props.board.wireNames[net], v: props.board.nets[net]?.n ?? net, t: p.t ?? '', p: props.board.jumperHint }
})
const miniKeys = sim.model.traces.filter((t: { fill?: boolean; threshold?: unknown }) => t.fill || t.threshold).map((t: { key: string }) => t.key)
const miniCaption = sim.model.traces.filter((t: { key: string }) => miniKeys.includes(t.key)).map((t: { label: string }) => t.label).join(' · ')

const stripName = (s: string) => (isRail(s) ? props.board.railNames[s] : 'عمود ' + s.slice(1) + (s[0] === 'T' ? ' فوق (a–e)' : ' تحت (f–j)'))
const holeRail = (h: string) => { const r = h.replace(/\d+$/, ''); return isRail(r) ? props.board.railNames[r] : '' }

const net = computed(() => (props.selection?.kind === 'net' ? props.selection.net : ''))
const netParts = computed(() => props.visible.filter(p => touchesNet(p, net.value)))
const netNames = computed(() => netParts.value.filter(p => p.k !== 'jumper').map(p => pinsOnNet(p, net.value)).join('، '))
const netJumpers = computed(() => netParts.value.filter(p => p.k === 'jumper').length)
const netStrips = computed(() => Object.keys(props.strips).filter(s => props.strips[s] === net.value).map(stripName).join('، '))

const meter = ref('')
let lastRead = 0
watch([sim.frame, net], () => {
  const now = performance.now()
  if (!net.value || now - lastRead < METER_REFRESH_MS) return
  lastRead = now
  meter.value = sim.reading(net.value)
}, { immediate: true })
watch(net, n => { if (n) meter.value = sim.reading(n) })
</script>

<template>
  <div id="bbInfo" class="card info" style="margin-top:12px">
    <template v-if="part">
      <template v-if="easy">
        <span class="tag">{{ part.lab ?? part.id }}</span>
        <h3>{{ edu.ic }} {{ edu.n }}</h3>
        <div class="edu"><b>هي إيه؟</b>{{ edu.what }}</div>
        <div class="edu"><b>بتعمل إيه هنا؟</b>{{ edu.why }}</div>
        <div v-if="part.t" class="edu"><b>السلك ده بالذات</b>{{ part.t }}</div>
      </template>
      <template v-else-if="tech">
        <h3>{{ tech.n }}</h3>
        <div class="val">{{ tech.v }}</div>
        <p style="margin:0">{{ tech.t }}</p>
        <div v-if="tech.p" class="pol">📌 {{ tech.p }}</div>
      </template>
      <div v-if="part.pins.length" class="bbloc">
        <b>مكانها على البورد</b>
        <ul :class="{ cols: part.pins.length > 4 }">
          <li v-for="([h], i) in part.pins" :key="h"><template v-if="part.pn"><b>{{ part.pn[i] }}</b> ← </template><template v-if="holeRail(h)">{{ holeRail(h) }}</template><code v-else>{{ h }}</code></li>
        </ul>
      </div>
      <div v-if="!easy && part.note" class="pol">🧭 {{ part.note }}</div>
      <div v-if="removalEffect" class="edu rmbox">
        <button class="btn" :class="{ pri: isRemoved }" @click="emit('toggleRemoved', part.id)">{{ isRemoved ? '↩️ رجّع القطعة مكانها' : '🗑️ شيل القطعة دي وشوف هيحصل إيه' }}</button>
        <div v-if="isRemoved" class="res" :class="'st-' + removalEffect.st">{{ STATUS_ICON[removalEffect.st] }} {{ removalEffect.r }}</div>
      </div>
      <AltOptions v-if="!isRemoved" :options="board.alternatives[eduKey]" :current="swaps[eduKey] ?? 0" @choose="i => emit('choose', eduKey, i)" />
      <ScopeCanvas class="bbmini" compact :keys="miniKeys" />
      <div class="bbmini-cap">{{ miniCaption }} · آخر 3 ثواني · <a href="#sim">افتح المحاكي الكامل ←</a></div>
    </template>
    <template v-else-if="net">
      <h3>🔌 {{ board.nets[net]?.n ?? net }}</h3>
      <div class="bbmeter"><span>📟 الملتيميتر (السالب على الأرضي)</span><b>{{ meter }}</b></div>
      <p style="margin:0"><b>متوصل بيه:</b> {{ netNames || '—' }}<template v-if="netJumpers"> · و{{ netJumpers }} سلك جمبر</template>.</p>
      <div v-if="netStrips" class="pol">📍 {{ netStrips }}</div>
    </template>
    <template v-else-if="selection?.kind === 'strip'">
      <h3>⭕ {{ stripName(selection.strip) }}</h3>
      <p style="margin:0">مفيش حاجة متوصلة هنا في المرحلة دي.</p>
      <div class="pol">📌 الخمس خرم اللي في العمود الواحد (a–e أو f–j) متوصلين ببعض من جوه. عشان كده أي رجلين في نفس العمود = متوصلين.</div>
    </template>
    <template v-else-if="easy">
      <h3>👆 دوس على أي قطعة</h3>
      <p style="margin:0 0 8px;color:var(--muted)">هقولك بالبلدي ومن غير مصطلحات: القطعة دي إيه، وبتعمل إيه هنا، ولو مش لاقيها تجيب إيه بدالها.</p>
      <div class="pol">📌 لو دي أول مرة ليك مع الإلكترونيات، اقرا "أساسيات في دقيقة" تحت البورد الأول.</div>
    </template>
    <template v-else>
      <h3>👆 دوس على أي قطعة أو خرم</h3>
      <p style="margin:0 0 8px;color:var(--muted)">القطعة هتقولك هي إيه وكل رجل منها في أنهي خرم. والخرم هيوريك كل اللي متوصل بيه، ويقيسلك الجهد عليه لايف.</p>
      <div class="pol">📌 الحرف = الصف، والرقم = العمود. يعني <code>g26</code> = صف g عمود 26.</div>
    </template>
  </div>
</template>

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type { AltOption, SimModel } from '../types/circuit'

export const HISTORY_SAMPLES = 750
const STEP_S = 0.001
const SAMPLE_EVERY_S = 0.004
const MAX_FRAME_S = 0.05
const WARMUP_SAMPLES = HISTORY_SAMPLES

export interface Simulation<P, S> {
  model: SimModel<P, S>
  base: ShallowRef<P>
  params: ComputedRef<P>
  removed: Ref<string[]>
  toggleRemoved: (id: string) => void
  swaps: Ref<Record<string, number>>
  running: Ref<boolean>
  frame: Ref<number>
  state: () => S
  history: () => number[][]
  brightness: ComputedRef<number>
  setParams: (p: P) => void
  setRunning: (on: boolean) => void
  setSwap: (key: string, index: number, alternatives: Record<string, AltOption<P>[]>) => void
  resetAll: () => void
  reading: (net: string) => string
}

export function applySwaps<P>(base: P, swaps: Record<string, number>, alternatives: Record<string, AltOption<P>[]>): P {
  return Object.entries(swaps).reduce((p, [k, i]) => alternatives[k]?.[i]?.fx?.(p) ?? p, base)
}

export function useSimulation<P, S>(
  model: SimModel<P, S>,
  preserve: (current: P, next: P) => P = (_c, n) => n,
  withoutParts: (p: P, removed: Set<string>) => P = p => p
): Simulation<P, S> {
  const base = shallowRef(model.defaults)
  const removed = ref<string[]>([])
  const params = computed(() => withoutParts(base.value, new Set(removed.value)))
  const swaps = ref<Record<string, number>>({})
  const running = ref(true)
  const frame = ref(0)
  let state = model.init(model.defaults)
  const history: number[][] = model.traces.map(() => [])
  let sampleClock = 0
  let last = 0
  let raf = 0

  const sample = () => {
    history.forEach((h, i) => {
      h.push(model.traces[i].value(state))
      if (h.length > HISTORY_SAMPLES) h.shift()
    })
  }

  const advance = (seconds: number) => {
    for (let t = 0; t < seconds; t += STEP_S) {
      model.step(state, params.value, STEP_S)
      sampleClock += STEP_S
      if (sampleClock >= SAMPLE_EVERY_S) { sampleClock = 0; sample() }
    }
  }

  const loop = (now: number) => {
    const elapsed = Math.min(MAX_FRAME_S, (now - last) / 1000)
    last = now
    if (running.value) advance(elapsed)
    frame.value++
    raf = requestAnimationFrame(loop)
  }

  onMounted(() => {
    for (let i = 0; i < WARMUP_SAMPLES; i++) advance(SAMPLE_EVERY_S)
    last = performance.now()
    raf = requestAnimationFrame(loop)
  })
  onBeforeUnmount(() => cancelAnimationFrame(raf))

  const setParams = (p: P) => { base.value = p }
  const toggleRemoved = (id: string) => {
    removed.value = removed.value.includes(id) ? removed.value.filter(x => x !== id) : [...removed.value, id]
  }
  const setRunning = (on: boolean) => { running.value = on }

  const setSwap = (key: string, index: number, alternatives: Record<string, AltOption<P>[]>) => {
    const rest = Object.fromEntries(Object.entries(swaps.value).filter(([k]) => k !== key))
    swaps.value = index ? { ...rest, [key]: index } : rest
    base.value = preserve(base.value, applySwaps(model.defaults, swaps.value, alternatives))
  }

  const resetAll = () => {
    swaps.value = {}
    removed.value = []
    base.value = preserve(base.value, model.defaults)
  }

  const brightness = computed(() => {
    void frame.value
    return model.brightness(state)
  })

  return {
    model,
    base,
    params,
    removed,
    toggleRemoved,
    swaps,
    running,
    frame,
    state: () => state,
    history: () => history,
    brightness,
    setParams,
    setRunning,
    setSwap,
    resetAll,
    reading: (net: string) => model.netReading(net, state, params.value)
  }
}

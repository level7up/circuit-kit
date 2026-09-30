import { computed, ref, watch } from 'vue'
import { EXAMPLES, explain, partLabels } from '../lab/sandbox-content'
import { canPlace, occupied, orientationOf, secondHole } from '../lib/sandbox/placement'
import { solve, type SandboxKind, type SandboxPart } from '../lib/sandbox/solver'

const STORAGE_KEY = 'circuit-lab:sandbox'

interface Saved {
  parts: SandboxPart[]
  supply: number
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : null
    if (data && Array.isArray(data.parts) && typeof data.supply === 'number') return data
  } catch {
    return { parts: [], supply: 9 }
  }
  return { parts: [], supply: 9 }
}

function save(data: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    return
  }
}

const newId = (kind: SandboxKind) => `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export function useSandbox() {
  const initial = load()
  const parts = ref<SandboxPart[]>(initial.parts)
  const supply = ref(initial.supply)
  const selected = ref<string | null>(null)

  const result = computed(() => solve(parts.value, supply.value))
  const messages = computed(() => explain(parts.value, result.value, supply.value))
  const labels = computed(() => partLabels(parts.value))
  const selectedPart = computed(() => parts.value.find(p => p.id === selected.value) ?? null)

  watch(result, r => {
    if (r.burnedNow.length) parts.value = parts.value.map(p => (r.burnedNow.includes(p.id) ? { ...p, burned: true, burnCurrent: r.parts[p.id]?.current } : p))
  })
  watch([parts, supply], () => save({ parts: parts.value, supply: supply.value }), { deep: true })

  const update = (id: string, patch: Partial<SandboxPart>) => {
    parts.value = parts.value.map(p => (p.id === id ? { ...p, ...patch } : p))
  }
  const add = (part: Omit<SandboxPart, 'id'>): string => {
    const id = newId(part.kind)
    parts.value = [...parts.value, { ...part, id }]
    return id
  }
  const remove = (id: string) => {
    parts.value = parts.value.filter(p => p.id !== id)
    if (selected.value === id) selected.value = null
  }
  const rotate = (id: string): boolean => {
    const p = parts.value.find(x => x.id === id)
    if (!p || p.kind === 'wire') return false
    const b = secondHole(p.a, p.kind, orientationOf(p) === 'h' ? 'v' : 'h')
    if (!canPlace(p.a, b, occupied(parts.value, id))) return false
    update(id, { b })
    return true
  }
  const flip = (id: string) => {
    const p = parts.value.find(x => x.id === id)
    if (p) update(id, { a: p.b, b: p.a })
  }
  const loadExample = (key: string) => {
    const ex = EXAMPLES.find(e => e.key === key)
    if (!ex) return
    parts.value = ex.parts.map(p => ({ ...p, id: newId(p.kind) }))
    supply.value = ex.supply
    selected.value = null
  }
  const clear = () => { parts.value = []; selected.value = null }

  return { parts, supply, selected, selectedPart, result, messages, labels, add, update, remove, rotate, flip, loadExample, clear }
}

export type Sandbox = ReturnType<typeof useSandbox>

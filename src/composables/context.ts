import { inject, type InjectionKey, type Ref } from 'vue'
import type { AnyCircuit } from '../circuits'
import type { Simulation } from './useSimulation'

export interface Guide {
  step: Ref<number>
  openStep: (index: number) => void
  tab: Ref<string>
  openTab: (id: string) => void
}

export const CircuitKey: InjectionKey<AnyCircuit> = Symbol('circuit')
export const SimKey: InjectionKey<Simulation<any, any>> = Symbol('simulation')
export const GuideKey: InjectionKey<Guide> = Symbol('guide')

function required<T>(key: InjectionKey<T>, name: string): T {
  const value = inject(key)
  if (!value) throw new Error(`${name} was not provided; mount this component inside App.vue`)
  return value
}

export const useCircuit = () => required(CircuitKey, 'Circuit')
export const useSim = () => required(SimKey, 'Simulation')
export const useGuide = () => required(GuideKey, 'Guide')

export const STEPS = 10

export const LEFT_STEPS = [0, 2]
export const RIGHT_STEPS = [5, 7]

export interface Outputs {
  left: boolean
  right: boolean
}

export const outputs = (step: number): Outputs => ({ left: LEFT_STEPS.includes(step), right: RIGHT_STEPS.includes(step) })

export const BUTTON_OUT = 0
export const BUTTON_IN = 1
export const BUTTON_HOLD = 2

export const isSteadyButton = (v: number): boolean => v === BUTTON_IN || v === BUTTON_HOLD

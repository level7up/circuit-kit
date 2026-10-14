import { HOST_ERROR, HOST_IDLE, HOST_LISTENING, HOST_PROCESSING, HOST_SPEAKING } from './device'

export type HostState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'CANCELLED' | 'ERROR'

export type HostEvent = 'PTT_DOWN' | 'PTT_UP' | 'CANCEL' | 'REPLY' | 'FAILED' | 'SPOKEN' | 'SETTLED' | 'DISCONNECTED'

export type HostAction =
  | 'START_RECORDING' | 'FINISH_RECORDING' | 'DISCARD_RECORDING' | 'ABORT_REQUEST' | 'SPEAK' | 'STOP_SPEAKING'

export interface Transition {
  state: HostState
  actions: HostAction[]
}

type Table = Partial<Record<HostState, Partial<Record<HostEvent, Transition>>>>

const to = (state: HostState, ...actions: HostAction[]): Transition => ({ state, actions })

const listenAgain = to('LISTENING', 'START_RECORDING')

export const TRANSITIONS: Table = {
  IDLE: { PTT_DOWN: listenAgain },
  LISTENING: {
    PTT_UP: to('PROCESSING', 'FINISH_RECORDING'),
    CANCEL: to('CANCELLED', 'DISCARD_RECORDING'),
    FAILED: to('ERROR', 'DISCARD_RECORDING'),
    DISCONNECTED: to('IDLE', 'DISCARD_RECORDING')
  },
  PROCESSING: {
    REPLY: to('SPEAKING', 'SPEAK'),
    FAILED: to('ERROR'),
    CANCEL: to('CANCELLED', 'ABORT_REQUEST'),
    DISCONNECTED: to('IDLE', 'ABORT_REQUEST')
  },
  SPEAKING: {
    SPOKEN: to('IDLE'),
    CANCEL: to('CANCELLED', 'STOP_SPEAKING'),
    PTT_DOWN: to('LISTENING', 'STOP_SPEAKING', 'START_RECORDING'),
    DISCONNECTED: to('IDLE', 'STOP_SPEAKING')
  },
  CANCELLED: { SETTLED: to('IDLE'), PTT_DOWN: listenAgain },
  ERROR: { SETTLED: to('IDLE'), PTT_DOWN: listenAgain }
}

export const SETTLE_MS: Partial<Record<HostState, number>> = { CANCELLED: 1000, ERROR: 3000 }

export function transition(state: HostState, event: HostEvent): Transition {
  return TRANSITIONS[state]?.[event] ?? { state, actions: [] }
}

const WIRE: Record<HostState, number> = {
  IDLE: HOST_IDLE,
  LISTENING: HOST_LISTENING,
  PROCESSING: HOST_PROCESSING,
  SPEAKING: HOST_SPEAKING,
  CANCELLED: HOST_IDLE,
  ERROR: HOST_ERROR
}

export const wireStateOf = (s: HostState): number => WIRE[s]

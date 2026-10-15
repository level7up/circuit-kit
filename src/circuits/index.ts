import type { Circuit } from '../types/circuit'
import { angelEye } from './angel-eye'
import { autoCover } from './auto-cover'
import { claudeVoice } from './claude-voice'
import { fuelBench } from './fuel-bench'
import { headlightFlash } from './headlight-flash'
import { parkingFlicker } from './parking-flicker'
import { tempraDiag } from './tempra-diag'
import { theaterChase } from './theater-chase'
import { usbCharger } from './usb-charger'

export type AnyCircuit = Circuit<any, any>

export const circuits: AnyCircuit[] = [parkingFlicker, angelEye, theaterChase, usbCharger, headlightFlash, fuelBench, claudeVoice, tempraDiag, autoCover]

export function findCircuit(id: string | null): AnyCircuit | undefined {
  return circuits.find(c => c.id === id)
}

export { HOME_HREF, circuitHref } from './links'

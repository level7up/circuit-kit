import type { Circuit } from '../types/circuit'
import { angelEye } from './angel-eye'
import { fuelBench } from './fuel-bench'
import { headlightFlash } from './headlight-flash'
import { parkingFlicker } from './parking-flicker'
import { theaterChase } from './theater-chase'
import { usbCharger } from './usb-charger'

export type AnyCircuit = Circuit<any, any>

export const circuits: AnyCircuit[] = [parkingFlicker, angelEye, theaterChase, usbCharger, headlightFlash, fuelBench]

export function findCircuit(id: string | null): AnyCircuit | undefined {
  return circuits.find(c => c.id === id)
}

export const circuitHref = (id: string): string => '?circuit=' + encodeURIComponent(id)
export const HOME_HREF = './'

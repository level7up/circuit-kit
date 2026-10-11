import type { Circuit } from '../types/circuit'
import { angelEye } from './angel-eye'
import { headlightPatterns } from './headlight-patterns'
import { parkingFlicker } from './parking-flicker'
import { theaterChase } from './theater-chase'
import { usbCharger } from './usb-charger'

export type AnyCircuit = Circuit<any, any>

export const circuits: AnyCircuit[] = [parkingFlicker, angelEye, theaterChase, usbCharger, headlightPatterns]

export function findCircuit(id: string | null): AnyCircuit | undefined {
  return circuits.find(c => c.id === id)
}

export const circuitHref = (id: string): string => '?circuit=' + encodeURIComponent(id)
export const HOME_HREF = './'

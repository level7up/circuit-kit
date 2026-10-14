export const ECU_ADDRESS = 0x10
export const SESSION_BAUD = 4800
export const SYNC_BYTE = 0x55
export const END_BYTE = 0x03
export const KEY_BYTE_INDEX = 2
export const MAX_KEYWORDS = 6
export const WAKE_DATA_BITS = 8
export const HEADER_BYTES = 3
export const MAX_DATA = 12
export const MIN_LENGTH = HEADER_BYTES
export const MAX_LENGTH = HEADER_BYTES + MAX_DATA
export const MAX_BLOCKS = 8
export const MAX_MEMORY_READ = 12
const UNPRINTABLE = '.'

export const TITLE = {
  memoryRead: 0x01,
  readErrors: 0x07,
  ack: 0x09,
  nak: 0x0a,
  sensorCollection: 0x12,
  sensorData: 0xf4,
  ident: 0xf6,
  errorData: 0xfc,
  memoryData: 0xfe
} as const

export type Purpose = 'ident' | 'read-errors' | 'read-memory' | 'read-sensors' | 'keep-alive'
export type RequestPurpose = Extract<Purpose, 'read-errors' | 'read-memory' | 'read-sensors'>

export interface Block {
  readonly counter: number
  readonly title: number
  readonly data: readonly number[]
}

export interface Request {
  readonly purpose: RequestPurpose
  readonly valid: boolean
  readonly data: readonly number[]
}

export interface Reply {
  readonly purpose: Purpose
  readonly rejected: boolean
  readonly blocks: readonly Block[]
}

export const complement = (b: number): number => ~b & 0xff

export function titleFor(p: Purpose): number {
  if (p === 'read-errors') return TITLE.readErrors
  if (p === 'read-memory') return TITLE.memoryRead
  if (p === 'read-sensors') return TITLE.sensorCollection
  return TITLE.ack
}

export function wakeBitHigh(address: number, bitIndex: number): boolean {
  if (bitIndex === 0) return false
  if (bitIndex > WAKE_DATA_BITS) return true
  return ((address >> (bitIndex - 1)) & 1) === 1
}

export const readErrors = (): Request => ({ purpose: 'read-errors', valid: true, data: [] })

export const readSensors = (): Request => ({ purpose: 'read-sensors', valid: true, data: [] })

export function readMemory(address: number, length: number): Request {
  const valid = Number.isInteger(length) && length >= 1 && length <= MAX_MEMORY_READ && address >= 0 && address <= 0xffff
  return { purpose: 'read-memory', valid, data: [length & 0xff, (address >> 8) & 0xff, address & 0xff] }
}

const isPrintable = (c: number): boolean => c >= 0x20 && c < 0x7f

export const identText = (ident: Reply): string =>
  ident.blocks.flatMap(b => b.data).map(c => (isPrintable(c) ? String.fromCharCode(c) : UNPRINTABLE)).join('')

export const hex = (bytes: readonly number[]): string => bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')

import { describe, expect, it } from 'vitest'
import { fmtC, fmtR, resistorBands } from '../src/lib/format'

const BROWN = '#7a4a1e', BLACK = '#161616', ORANGE = '#f07a1a', GREEN = '#2f9e44', BLUE = '#2563eb', GRAY = '#8a8a8a', YELLOW = '#f2d21b', VIOLET = '#8b3fd9', RED = '#d42a2a'

describe('resistor colour bands', () => {
  it.each([
    [10e3, [BROWN, BLACK, ORANGE]],
    [1e6, [BROWN, BLACK, GREEN]],
    [68, [BLUE, GRAY, BLACK]],
    [68e3, [BLUE, GRAY, ORANGE]],
    [470, [YELLOW, VIOLET, BROWN]],
    [6.8e3, [BLUE, GRAY, RED]]
  ])('%d Ω', (ohm, expected) => {
    expect(resistorBands(ohm).slice(0, 3)).toEqual(expected)
  })
})

describe('value formatting', () => {
  it('formats resistance and capacitance', () => {
    expect(fmtR(390e3)).toBe('390kΩ')
    expect(fmtR(0)).toBe('بدون')
    expect(fmtC(22e-6)).toBe('22µF')
  })
})

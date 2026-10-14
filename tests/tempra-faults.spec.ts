import { describe, expect, it } from 'vitest'
import FIRMWARE_FAULTS from '../firmware/tempra_diag/faults.h?raw'
import { FAULTS, decodeFault } from '../src/tempra/faults'
import { TITLE, type Block } from '../src/tempra/protocol'

const errorBlock = (data: number[]): Block => ({ counter: 1, title: TITLE.errorData, data })

describe('fault reports', () => {
  it('reads the code low byte first, as the reference scanner does', () => {
    const r = decodeFault(errorBlock([0x02, 0x0a, 0x1e]))
    expect(r.code).toBe(0x0a02)
    expect(r.codeHex).toBe('0A02')
    expect(r.info?.short).toBe('COOLANT TEMP')
    expect(r.present).toBe(true)
  })

  it('keeps unknown codes with their raw bytes and no meaning', () => {
    const r = decodeFault(errorBlock([0x12, 0x00, 0x9e]))
    expect(r.code).toBe(0x0012)
    expect(r.info).toBeNull()
    expect(r.present).toBe(false)
    expect(r.raw).toEqual([0x12, 0x00, 0x9e])
  })

  it('does not decode blocks that are not error data', () => {
    const r = decodeFault({ counter: 1, title: TITLE.memoryData, data: [1, 2, 3] })
    expect(r.code).toBeNull()
    expect(r.info).toBeNull()
  })

  it('flags the crank code as normal with the engine off', () => {
    expect(FAULTS.find(f => f.code === 0x0302)?.engineOffNormal).toBe(true)
  })

  it('has unique codes and complete bilingual text', () => {
    expect(new Set(FAULTS.map(f => f.code)).size).toBe(FAULTS.length)
    FAULTS.forEach(f => {
      ;[f.part, f.meaning].forEach(t => {
        expect(t.ar.length, f.short).toBeGreaterThan(0)
        expect(t.en.length, f.short).toBeGreaterThan(0)
      })
      ;[f.causes, f.checks].forEach(list => {
        expect(list.ar.length, f.short).toBeGreaterThan(0)
        expect(list.en.length, f.short).toBe(list.ar.length)
      })
    })
  })

  it('never advises clearing codes or driving parts', () => {
    const text = JSON.stringify(FAULTS).toLowerCase()
    expect(text).not.toMatch(/clear|امسح/)
  })

  it('matches the firmware fault table code for code and name', () => {
    const firmware = [...FIRMWARE_FAULTS.matchAll(/\{0x([0-9A-F]{4}), "([^"]+)"\}/g)].map(([, c, n]) => [parseInt(c, 16), n])
    expect(firmware).toEqual(FAULTS.map(f => [f.code, f.short]))
  })
})

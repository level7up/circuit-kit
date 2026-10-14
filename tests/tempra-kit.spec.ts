import { describe, expect, it } from 'vitest'
import { assembly } from '../src/circuits/tempra-diag/assembly'
import { ESP_GPIO, ESP_NETS, SCHEMATIC, diagLayout, tag } from '../src/circuits/tempra-diag/board'
import { verifyPerfboard } from '../src/lib/perfboard/grid'
import { verifyStripLayout } from '../src/lib/perfboard/strips'
import { veroLayout } from '../src/circuits/tempra-diag/vero'
import FIRMWARE from '../firmware/tempra_diag/tempra_diag.ino?raw'
import { tempraDiag } from '../src/circuits/tempra-diag'
import { bom } from '../src/circuits/tempra-diag/bom'
import { APP_HREF, hero } from '../src/circuits/tempra-diag/content'
import {
  ECU_NOISY, ECU_SILENT, OFF, adcV, defaults, init, kHighV, screenLines, step, thresholdV, type TempraParams, type TempraState
} from '../src/circuits/tempra-diag/simulate'
import type { BomItem, BomRow, PerfLayout } from '../src/types/circuit'

const STEP_S = 0.001
const CONNECT_S = 3

function run(p: TempraParams, seconds: number, s: TempraState = init(p)): TempraState {
  for (let t = 0; t < seconds; t += STEP_S) step(s, p, STEP_S)
  return s
}

const isItem = (r: BomRow): r is BomItem => 'n' in r

describe('Tempra kit simulator', () => {
  it('wakes the simulated ECU and shows its identification', () => {
    const s = run(defaults, CONNECT_S)
    expect(s.session.phase === 'ready' || s.session.phase === 'link').toBe(true)
    expect(screenLines(s, defaults)[2]).toBe('0261200721BOSCH MA17')
  })

  it('keeps the handheld screen on READY while idle', () => {
    const s = run(defaults, CONNECT_S)
    const shown = new Set<string>()
    for (let t = 0; t < 3; t += STEP_S) {
      step(s, defaults, STEP_S)
      shown.add(screenLines(s, defaults)[1])
    }
    expect([...shown]).toEqual(['READY'])
  })

  it('starts the wake-up again when restarted', () => {
    const s = run(defaults, CONNECT_S)
    const again = { ...defaults, restartSeq: 1 }
    step(s, again, STEP_S)
    expect(s.session.phase).toBe('wake')
    expect(s.session.ident).toBeNull()
    run(again, CONNECT_S, s)
    expect(s.session.ident).not.toBeNull()
    expect(s.session.reconnects).toBe(0)
  })

  it('reads the example faults when the faults button is pressed', () => {
    const s = run(defaults, CONNECT_S)
    const pressed = { ...defaults, faultsSeq: 1 }
    run(pressed, 1, s)
    expect(s.faults?.blocks).toHaveLength(2)
    expect(screenLines(s, pressed)).toContain('0A02 COOLANT TEMP')
  })

  it('reads the example sensors when the sensors button is pressed', () => {
    const s = run(defaults, CONNECT_S)
    run({ ...defaults, sensorsSeq: 1 }, 1, s)
    expect(s.sensors?.blocks[0].data).toHaveLength(10)
  })

  it('never connects with the key off and keeps retrying', () => {
    const p = { ...defaults, key: OFF }
    const s = run(p, 10)
    expect(s.session.ident).toBeNull()
    expect(s.session.reconnects).toBeGreaterThan(0)
  })

  it('never connects when the lead is on the wrong pin', () => {
    expect(run({ ...defaults, ecu: ECU_SILENT }, 10).session.ident).toBeNull()
  })

  it('drops and recovers the link on line noise', () => {
    const s = run({ ...defaults, ecu: ECU_NOISY }, 12)
    expect(s.session.reconnects).toBeGreaterThan(0)
    expect(s.session.fault).toBe('complement')
  })

  it('connects after the key is turned on', () => {
    const s = run({ ...defaults, key: OFF }, 2)
    run(defaults, 8, s)
    expect(s.session.ident).not.toBeNull()
  })
})

describe('Tempra kit circuit numbers', () => {
  it('matches the hardware design table at 12.6 V and 14.4 V', () => {
    expect(kHighV(12.6)).toBeCloseTo(11.7, 2)
    expect(thresholdV(12.6)).toBeCloseTo(6.3, 1)
    expect(thresholdV(14.4)).toBeCloseTo(7.22, 1)
    expect(adcV(12.6)).toBeCloseTo(1.25, 2)
  })

  it('keeps the threshold inside the ISO 9141 window across the battery range', () => {
    ;[9, 12.6, 14.4].forEach(v => {
      expect(thresholdV(v)).toBeGreaterThan(0.3 * kHighV(v))
      expect(thresholdV(v)).toBeLessThan(0.7 * kHighV(v))
    })
  })
})

describe('Tempra kit content', () => {
  it('prices every counted part and leaves uncounted ones at zero', () => {
    bom.filter(isItem).forEach(r => {
      if (r.car) expect(r.p, r.s).toBe(0)
      else expect(r.p, r.s).toBeGreaterThan(0)
    })
  })

  it('quotes the handheld cost the parts list adds up to', () => {
    const counted = bom.filter(isItem).filter(r => r.on && !r.car && r.n !== 'ملتيميتر')
    const total = counted.reduce((s, r) => s + r.q * r.p, 0)
    const quoted = Number(hero.stats[3].value.replace(/[^\d]/g, ''))
    expect(Math.abs(total - quoted)).toBeLessThan(25)
  })

  it('links the free app from the overview and the first-connection step', () => {
    expect(tempraDiag.overview?.cards.some(c => c.body.includes(APP_HREF))).toBe(true)
    expect(tempraDiag.steps?.items.some(s => s.b.includes(APP_HREF))).toBe(true)
  })
})

const DEVKIT_GPIO_BY_PIN: Record<number, number> = { 4: 34, 6: 32, 7: 33, 8: 25, 9: 26, 10: 27, 11: 14, 13: 13 }
const firmwarePin = (name: string): number => Number(FIRMWARE.match(new RegExp('PIN_' + name + ' = (\\d+);'))?.[1])

const upTo = (layout: PerfLayout, s: number): PerfLayout => ({
  ...layout,
  parts: layout.parts.filter(p => p.s <= s),
  traces: layout.traces.filter(t => t.s <= s)
})

describe('Tempra kit perfboard', () => {
  it('has no clashes, shorts or broken nets', () => {
    expect(verifyPerfboard(diagLayout)).toEqual([])
  })

  it('wires every part to its schematic net', () => {
    const fixed = diagLayout.parts.filter(p => p.k !== 'pad' && p.k !== 'wire')
    expect(Object.fromEntries(fixed.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('puts each signal on the ESP32 pin the firmware uses', () => {
    const firmware: Record<string, string> = { VBS: 'VBAT', BPG: 'PAGE', BSN: 'SENSORS', BFT: 'FAULTS', TX: 'K_TX', RX: 'K_RX', SCL: 'SCL', SDA: 'SDA' }
    Object.entries(ESP_GPIO).forEach(([net, gpio]) => {
      expect(firmwarePin(firmware[net]), net).toBe(gpio)
      const pin = Number(Object.entries(DEVKIT_GPIO_BY_PIN).find(([, g]) => g === gpio)?.[0])
      expect(ESP_NETS[pin - 1], net).toBe(net)
    })
  })

  it('never shorts two nets while it is being built', () => {
    new Set(diagLayout.parts.map(p => p.s)).forEach(s =>
      expect(verifyPerfboard(upTo(diagLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })

})

describe('Tempra kit stripboard', () => {
  it('has no shared holes, shorts or broken nets', () => {
    expect(verifyStripLayout(veroLayout)).toEqual([])
  })

  it('never shorts two nets while it is being built', () => {
    new Set(veroLayout.parts.map(p => p.s)).forEach(s =>
      expect(verifyStripLayout(upTo(veroLayout, s)).filter(p => p.kind !== 'split'), 'stage ' + s).toEqual([]))
  })

  it('uses the same parts and nets as the dot board', () => {
    const fixed = veroLayout.parts.filter(p => p.k !== 'pad' && p.k !== 'wire')
    expect(Object.fromEntries(fixed.map(p => [p.id, p.nets]))).toEqual(SCHEMATIC)
  })

  it('reports a short when one cut is missing', () => {
    const cuts = veroLayout.strips!.cuts.slice(1)
    expect(verifyStripLayout({ ...veroLayout, strips: { axis: 'rows', cuts } }).some(p => p.kind === 'short')).toBe(true)
  })
})

describe.each(assembly.boards.map(b => [b.label, b] as const))('Tempra kit build phases on %s', (_, board) => {
  it('has a build phase for every stage', () => {
    const phases = new Set(board.phases.map(p => p.s))
    new Set([...board.layout.parts.map(p => p.s), ...board.layout.traces.map(t => t.s)]).forEach(s => expect(phases.has(s), 'stage ' + s).toBe(true))
  })

  it('only names holes that exist on the board', () => {
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const colOf = (c: string): number => (c.length === 1 ? LETTERS.indexOf(c) : LETTERS.length + LETTERS.indexOf(c[1]))
    const text = board.phases.map(p => p.b + p.x + p.c.join(' ')).join(' ') + board.layout.parts.map(p => p.tip).join(' ')
    ;[...text.matchAll(/⟦([A-Z]+)(\d+)⟧/g)].forEach(([tag, c, r]) => {
      expect(colOf(c), tag).toBeLessThan(board.layout.cols)
      expect(Number(r), tag).toBeLessThanOrEqual(board.layout.rows)
    })
  })

  it('names every part leg in its tip', () => {
    board.layout.parts.filter(p => p.k !== 'dip').forEach(p => {
      expect(p.tip, p.id).toContain(tag(p.legs[0]))
    })
  })
})

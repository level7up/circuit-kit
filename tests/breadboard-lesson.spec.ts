import { describe, expect, it } from 'vitest'
import { lessonSteps } from '../src/learn/breadboard-lesson'
import { allStrips, parseHole, stripOf } from '../src/lib/breadboard/geometry'

const strips = new Set(allStrips())

describe('empty breadboard lesson', () => {
  it.each(lessonSteps.map(s => [s.title, s] as const))('%s only points at real holes and strips', (_t, step) => {
    expect(step.highlights.filter(h => !strips.has(h.strip))).toEqual([])
    expect(step.marks.filter(h => !parseHole(h))).toEqual([])
    expect(step.demo.flatMap(p => p.pins.map(x => x[0])).filter(h => !parseHole(h))).toEqual([])
  })

  it('highlights exactly the strips each demo part plugs into', () => {
    for (const step of lessonSteps.filter(s => s.demo.length)) {
      const used = new Set(step.demo.flatMap(p => p.pins.map(x => stripOf(x[0]))))
      expect(new Set(step.highlights.map(h => h.strip))).toEqual(used)
    }
  })

  it('shows the classic mistake with both resistor legs in one column', () => {
    const mistake = lessonSteps.find(s => s.title.includes('غلطة'))
    const [a, b] = mistake?.demo[0].pins.map(x => stripOf(x[0])) ?? []
    expect(a).toBe(b)
  })

  it('seats the chip so every pin gets its own strip', () => {
    const chip = lessonSteps.flatMap(s => s.demo).find(p => p.k === 'dip')
    const used = chip?.pins.map(x => stripOf(x[0])) ?? []
    expect(new Set(used).size).toBe(used.length)
  })
})

import { describe, expect, it } from 'vitest'
import { circuits } from '../src/circuits'
import { ALL, categories, categoryHref, inCategory, parseCategory } from '../src/circuits/categories'

describe('kit categories', () => {
  it('gives every kit at least one known category', () => {
    const known = new Set(categories.map(c => c.id))
    circuits.forEach(c => {
      expect(c.card.categories.length, c.id).toBeGreaterThan(0)
      c.card.categories.forEach(id => expect(known.has(id), c.id + ' → ' + id).toBe(true))
    })
  })

  it('has no empty category', () => {
    categories.forEach(cat => expect(inCategory(circuits, cat.id).length, cat.id).toBeGreaterThan(0))
  })

  it('never tags a kit as both code and no-code', () => {
    circuits.forEach(c => expect(c.card.categories.includes('code') && c.card.categories.includes('no-code'), c.id).toBe(false))
  })

  it('shows every kit under all', () => {
    expect(inCategory(circuits, ALL)).toEqual(circuits)
  })

  it('filters by category', () => {
    expect(inCategory(circuits, 'ai').map(c => c.id)).toEqual(['claude-voice'])
    expect(inCategory(circuits, 'code').map(c => c.id)).toEqual(['fuel-bench', 'claude-voice', 'tempra-diag', 'auto-cover'])
  })

  it('reads the filter from the URL and falls back to all', () => {
    expect(parseCategory('lighting')).toBe('lighting')
    expect(parseCategory('nonsense')).toBe(ALL)
    expect(parseCategory(null)).toBe(ALL)
  })

  it('round-trips the filter through its link', () => {
    categories.forEach(c => expect(parseCategory(new URLSearchParams(categoryHref(c.id).slice(1)).get('cat'))).toBe(c.id))
    expect(categoryHref(ALL)).toBe('./')
  })
})

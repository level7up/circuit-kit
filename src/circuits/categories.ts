import type { Category, CategoryId, Circuit } from '../types/circuit'

export const ALL = 'all'

export type CategoryFilter = CategoryId | typeof ALL

export const categories: Category[] = [
  { id: 'car', icon: '🚗', label: 'للعربية' },
  { id: 'lighting', icon: '💡', label: 'إضاءة وLED' },
  { id: 'power', icon: '🔋', label: 'كهربا وشحن' },
  { id: 'beginner', icon: '🔰', label: 'للمبتدئين' },
  { id: 'no-code', icon: '🔧', label: 'من غير برمجة' },
  { id: 'code', icon: '🧠', label: 'متحكمات وكود' },
  { id: 'desk', icon: '🖥️', label: 'على المكتب' },
  { id: 'ai', icon: '🤖', label: 'ذكاء اصطناعي' }
]

const isCategoryId = (v: string): v is CategoryId => categories.some(c => c.id === v)

export const parseCategory = (v: string | null): CategoryFilter => (v && isCategoryId(v) ? v : ALL)

export const categoryOf = (id: CategoryId): Category => categories.find(c => c.id === id)!

export function inCategory<T extends Pick<Circuit<unknown, unknown>, 'card'>>(list: T[], filter: CategoryFilter): T[] {
  return filter === ALL ? list : list.filter(c => c.card.categories.includes(filter))
}

export const categoryHref = (filter: CategoryFilter): string => (filter === ALL ? './' : '?cat=' + encodeURIComponent(filter))

export type ThemeKey = 'classic' | 'floral' | 'festival'
export type Theme = { key: ThemeKey; label: string; unlockAt: number; colors: readonly [string,string,string,string] }
export const THEMES: readonly Theme[] = [
  { key: 'classic', label: 'Classic Gold', unlockAt: 0, colors: ['#f8cc6f','#ffefc5','#bb404d','#397867'] },
  { key: 'floral', label: 'Floral Bloom', unlockAt: 5, colors: ['#f4a9bc','#f6e5b7','#ba547f','#62a394'] },
  { key: 'festival', label: 'Festival Lights', unlockAt: 15, colors: ['#4cd7d2','#f9d46f','#ed6a5e','#8264d7'] },
]

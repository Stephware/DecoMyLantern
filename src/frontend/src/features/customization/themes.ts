export type ThemeKey = 'classic' | 'floral' | 'festival'
export type Theme = { key: ThemeKey; label: string; colors: readonly [string, string, string, string] }

// All three collections are selectable without friend requirements.
export const THEMES: readonly Theme[] = [
  { key: 'classic', label: 'Classic Gold', colors: ['#f8cc6f', '#ffefc5', '#bb404d', '#397867'] },
  { key: 'floral', label: 'Floral Bloom', colors: ['#f4a9bc', '#f6e5b7', '#ba547f', '#62a394'] },
  { key: 'festival', label: 'Festival Lights', colors: ['#4cd7d2', '#f9d46f', '#ed6a5e', '#8264d7'] },
]

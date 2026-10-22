import type { OuterDesignKey } from '../lantern/growth/outerGrowth'

export type ThemeKey = OuterDesignKey
export type Theme = {
  key: ThemeKey
  label: string
  colors: readonly [string, string, string, string]
}

// Each family drives a different living outer-shell recipe. Unlock thresholds
// are checked by the API; these definitions are presentation-only.
export const THEMES: readonly Theme[] = [
  { key: 'classic', label: 'Classic Gold', colors: ['#f8cc6f', '#ffefc5', '#bb404d', '#397867'] },
  { key: 'floral', label: 'Floral Bloom', colors: ['#f4a9bc', '#f6e5b7', '#ba547f', '#62a394'] },
  { key: 'festival', label: 'Festival Lights', colors: ['#4cd7d2', '#f9d46f', '#ed6a5e', '#8264d7'] },
  { key: 'celestial', label: 'Celestial Lace', colors: ['#bdc5fa', '#f4ecdc', '#7f86c9', '#90c8c5'] },
  { key: 'fiesta', label: 'Radiant Fiesta', colors: ['#f6b350', '#fff3bb', '#df5468', '#60b3a9'] },
  { key: 'sampaguita', label: 'Sampaguita Glow', colors: ['#d8e9a5', '#fff2d2', '#f4adc2', '#8cb5a2'] },
]

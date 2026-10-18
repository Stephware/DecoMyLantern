/**
 * A traditional-parol-inspired radial drawing grammar. Every count produces
 * a complete, repeatable fivefold composition; no friend is assigned one ring
 * or one random ornament. The central identity lights are a separate layer.
 */
export type OuterDesignKey =
  | 'classic' | 'floral' | 'festival'
  | 'celestial' | 'fiesta' | 'sampaguita'

export type OuterDesignRecipe = {
  key: OuterDesignKey
  petals: number
  wave: 'facet' | 'petal' | 'lace' | 'burst'
  fullness: number
  contourCount: number
  motif: 'diamond' | 'flower' | 'fan' | 'star' | 'sun' | 'jasmine'
}

export const OUTER_RECIPES: Readonly<Record<OuterDesignKey, OuterDesignRecipe>> = {
  classic: { key: 'classic', petals: 10, wave: 'facet', fullness: 0.8, contourCount: 3, motif: 'diamond' },
  floral: { key: 'floral', petals: 10, wave: 'petal', fullness: 1.12, contourCount: 3, motif: 'flower' },
  festival: { key: 'festival', petals: 20, wave: 'burst', fullness: 0.9, contourCount: 3, motif: 'fan' },
  celestial: { key: 'celestial', petals: 20, wave: 'lace', fullness: 0.9, contourCount: 3, motif: 'star' },
  fiesta: { key: 'fiesta', petals: 15, wave: 'burst', fullness: 1.12, contourCount: 3, motif: 'sun' },
  sampaguita: { key: 'sampaguita', petals: 10, wave: 'petal', fullness: 1.04, contourCount: 3, motif: 'jasmine' },
}

const CENTER_X = 300
const CENTER_Y = 302
const TAU = Math.PI * 2

function validateCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
}

export type OrnamentPlan = {
  /** Always entire groups of five, maintaining bilateral/radial balance. */
  bulbs: number
  scallops: number
  filigreePairs: number
  panelSeams: number
  illuminatedPetals: number
  starlets: number
}

/**
 * Baseline is richly decorated even without contributors.
 * Friend milestones add *sets* of handcraft-style ornamentation, with
 * continuous geometry changes between them instead of sparse isolated bits.
 */
export function ornamentPlanForFriends(count: number): OrnamentPlan {
  validateCount(count)
  const capped = Math.min(count, 80)
  return {
    bulbs: 40 + Math.floor(capped / 5) * 5,
    scallops: 30 + Math.floor(capped / 8) * 5,
    filigreePairs: 1 + Math.floor(capped / 8),
    panelSeams: 2 + Math.floor(capped / 13),
    illuminatedPetals: 5 + Math.floor(capped / 10) * 5,
    starlets: 5 + Math.floor(capped / 12) * 5,
  }
}

/** Growth stays legible at 50 instead of zooming the artwork into a dot. */
export function outerRadiusForFriends(count: number): number {
  validateCount(count)
  return 215 + 0.8 * Math.min(count, 50) +
    (count > 50 ? 13 * Math.log1p((count - 50) / 18) : 0)
}

export function outerFitZoom(count: number): number {
  const outer = outerRadiusForFriends(count)
  // Tassels extend 290 units down from the center. Preserve space for
  // decorative punta tips + their glow as the perimeter grows.
  return Math.min(1, 280 / Math.max(298, outer + 34))
}

export function growthPhase(count: number): number {
  validateCount(count)
  return count % 10
}

export function shellCountForFriends(count: number, key: OuterDesignKey): number {
  validateCount(count)
  const recipe = OUTER_RECIPES[key]
  return Math.min(recipe.contourCount, 2 + Math.floor(count / 20))
}

export function motifCountForFriends(count: number): number {
  validateCount(count)
  return Math.min(50, 25 + Math.floor(count / 5) * 5)
}

/** Strong graphic edges for facets, rounded lobes for capiz flowers. */
function radialWave(angle: number, recipe: OuterDesignRecipe): number {
  const cycle = angle * recipe.petals
  if (recipe.wave === 'facet') return 1 - (2 * Math.acos(Math.cos(cycle)) / Math.PI)
  if (recipe.wave === 'petal') return 2 * Math.pow((1 + Math.cos(cycle)) / 2, 1.65) - 1
  if (recipe.wave === 'lace') return 0.72 * Math.cos(cycle) + 0.18 * Math.cos(2 * cycle)
  return 0.73 * Math.cos(cycle) + 0.24 * Math.cos(2 * cycle)
}

/**
 * Scalloped metalwork perimeter (puntetas). The path is closed, cyclic,
 * deterministic and evolves *every* time a friend is accepted.
 */
export function outerShellPath(
  count: number,
  key: OuterDesignKey,
  layerIndex = 0,
): string {
  validateCount(count)
  if (!Number.isSafeInteger(layerIndex) || layerIndex < 0 || layerIndex > 3) {
    throw new RangeError('Invalid procedural shell layer.')
  }
  const recipe = OUTER_RECIPES[key]
  const base = outerRadiusForFriends(count) - layerIndex * (11 + recipe.fullness * 2)
  const phase = growthPhase(count)
  const amplitude = (5.3 + phase * 0.18 + Math.min(count, 50) * 0.035) *
    recipe.fullness * (1 - layerIndex * 0.08)
  const samples = recipe.petals * 18
  const points = Array.from({ length: samples }, (_, i) => {
    const a = -Math.PI / 2 + (i * TAU) / samples
    const radius = base + amplitude * radialWave(a + Math.PI / 2, recipe)
    return `${(CENTER_X + radius * Math.cos(a)).toFixed(2)} ${(CENTER_Y + radius * Math.sin(a)).toFixed(2)}`
  })
  return `M ${points.join(' L ')} Z`
}

export function outerPetalPath(
  count: number,
  key: OuterDesignKey,
  motifIndex: number,
): string {
  validateCount(count)
  if (!Number.isSafeInteger(motifIndex) || motifIndex < 0) {
    throw new RangeError('Invalid motif index.')
  }
  const recipe = OUTER_RECIPES[key]
  const total = motifCountForFriends(count)
  const a = -Math.PI / 2 + (motifIndex * TAU) / total
  const radius = outerRadiusForFriends(count)
  const half = (Math.PI / total) * (recipe.wave === 'petal' ? .86 : .67)
  const xy = (r: number, angle: number) =>
    `${(CENTER_X + r * Math.cos(angle)).toFixed(2)} ${(CENTER_Y + r * Math.sin(angle)).toFixed(2)}`
  const base = radius - 23
  const tip = radius + 4 + recipe.fullness * 5
  const start = xy(base, a - half)
  const end = xy(base, a + half)
  const controlL = xy(radius + 4, a - half * .5)
  const controlR = xy(radius + 4, a + half * .5)
  if (recipe.wave === 'petal' || recipe.wave === 'lace') {
    return `M ${start} Q ${controlL} ${xy(tip, a)} Q ${controlR} ${end} Z`
  }
  return `M ${start} L ${controlL} L ${xy(tip, a)} L ${controlR} L ${end} Z`
}

export function outerMotifPosition(
  count: number,
  motifIndex: number,
): { x: number; y: number } {
  validateCount(count)
  const total = motifCountForFriends(count)
  if (!Number.isSafeInteger(motifIndex) || motifIndex < 0 || motifIndex >= total) {
    throw new RangeError('Invalid motif index.')
  }
  const a = -Math.PI / 2 + (motifIndex * TAU) / total
  const radius = outerRadiusForFriends(count) - 13
  return { x: CENTER_X + radius * Math.cos(a), y: CENTER_Y + radius * Math.sin(a) }
}

export function polarPoint(radius: number, angleRadians: number): { x: number; y: number } {
  return {
    x: CENTER_X + radius * Math.cos(angleRadians),
    y: CENTER_Y + radius * Math.sin(angleRadians),
  }
}

/** A flat repeating 5-way enamel star with 10 vertices, used in glass inlays. */
export function insetStarPoints(
  centerX: number, centerY: number, outerRadius: number, innerRadius: number,
): string {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5
    const r = index % 2 === 0 ? outerRadius : innerRadius
    return `${(centerX + Math.cos(angle) * r).toFixed(2)},${(centerY + Math.sin(angle) * r).toFixed(2)}`
  }).join(' ')
}

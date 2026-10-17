/**
 * Pure, deterministic BeMyParol outer-shell generator.
 *
 * Every accepted friend changes the whole radial silhouette, not a literal
 * ring. Fivefold/radial symmetry, bounded ornament density, deterministic
 * growth and independent inner identity lights keep every count composed.
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
  classic: { key: 'classic', petals: 10, wave: 'facet', fullness: 0.82, contourCount: 2, motif: 'diamond' },
  floral: { key: 'floral', petals: 10, wave: 'petal', fullness: 1.02, contourCount: 2, motif: 'flower' },
  festival: { key: 'festival', petals: 20, wave: 'burst', fullness: 0.86, contourCount: 3, motif: 'fan' },
  celestial: { key: 'celestial', petals: 20, wave: 'lace', fullness: 0.77, contourCount: 3, motif: 'star' },
  fiesta: { key: 'fiesta', petals: 15, wave: 'burst', fullness: 1.08, contourCount: 3, motif: 'sun' },
  sampaguita: { key: 'sampaguita', petals: 10, wave: 'petal', fullness: 1.12, contourCount: 3, motif: 'jasmine' },
}

const CENTER_X = 300
const CENTER_Y = 302
const TAU = Math.PI * 2

function validateCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
}

export function outerRadiusForFriends(count: number): number {
  validateCount(count)
  // A shallow linear slope until 50 makes every friend visibly meaningful.
  // Logarithmic continuation avoids enormous artwork for unusually large counts.
  return 189 + 4.25 * Math.min(count, 50) +
    (count > 50 ? 48 * Math.log1p((count - 50) / 15) : 0)
}

export function outerFitZoom(count: number): number {
  const outer = outerRadiusForFriends(count)
  // Include the unchanged hanging tassels and the halo's stroke/glow margin.
  const extent = Math.max(294, outer + 29)
  return Math.min(1, 280 / extent)
}

export function growthPhase(count: number): number {
  validateCount(count)
  return count % 10
}

export function shellCountForFriends(count: number, key: OuterDesignKey): number {
  validateCount(count)
  const recipe = OUTER_RECIPES[key]
  return Math.min(recipe.contourCount + 1, 1 + Math.floor(count / 12))
}

export function motifCountForFriends(count: number): number {
  validateCount(count)
  // Always full fivefold groups; never a lopsided partly filled wedge.
  return Math.min(40, 5 * (1 + Math.floor(count / 7)))
}

function radialWave(angle: number, recipe: OuterDesignRecipe): number {
  const cycle = angle * recipe.petals
  if (recipe.wave === 'facet') {
    // Faceted diamonds with sharp deliberate corners.
    return 1 - 2 * Math.acos(Math.cos(cycle)) / Math.PI
  }
  if (recipe.wave === 'petal') {
    return Math.pow((1 + Math.cos(cycle)) / 2, 1.7) * 2 - 1
  }
  if (recipe.wave === 'lace') {
    return Math.cos(cycle) * 0.76 + Math.cos(2 * cycle) * 0.19
  }
  return Math.cos(cycle) * 0.8 + Math.cos(2 * cycle) * 0.23
}

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
  const outer = outerRadiusForFriends(count)
  const phase = growthPhase(count)
  const base = outer - layerIndex * (21 + recipe.fullness * 3)
  // Both radius and petal shape change on EVERY accepted friend.
  const amplitude = (13 + phase * 1.25 + Math.min(count, 50) * 0.17) *
    recipe.fullness * (1 - layerIndex * 0.12)
  const samples = recipe.wave === 'facet' ? recipe.petals * 8 : recipe.petals * 16
  const points = Array.from({ length: samples }, (_, index) => {
    const angle = -Math.PI / 2 + (index * TAU) / samples
    const radius = base + amplitude * radialWave(angle + Math.PI / 2, recipe)
    const x = CENTER_X + Math.cos(angle) * radius
    const y = CENTER_Y + Math.sin(angle) * radius
    return `${x.toFixed(2)} ${y.toFixed(2)}`
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
  const phase = growthPhase(count)
  const outer = outerRadiusForFriends(count)
  const motifCount = motifCountForFriends(count)
  const angle = -Math.PI / 2 + TAU * motifIndex / motifCount
  const inner = outer - 23 - phase * 0.5
  const tip = outer + 9 + recipe.fullness * 7
  const halfWidth = Math.PI / motifCount * (recipe.wave === 'petal' ? 0.76 : 0.56)
  const polar = (r: number, a: number) =>
    `${(CENTER_X + Math.cos(a) * r).toFixed(2)} ${(CENTER_Y + Math.sin(a) * r).toFixed(2)}`
  const start = polar(inner, angle - halfWidth)
  const mid = polar(tip, angle)
  const end = polar(inner, angle + halfWidth)
  const left = polar(outer + 3, angle - halfWidth * 0.6)
  const right = polar(outer + 3, angle + halfWidth * 0.6)
  // Quadratic curves create petals; angular families use clean faceted tips.
  if (recipe.wave === 'petal' || recipe.wave === 'lace') {
    return `M ${start} Q ${left} ${mid} Q ${right} ${end} Z`
  }
  return `M ${start} L ${left} L ${mid} L ${right} L ${end} Z`
}

export function outerMotifPosition(
  count: number,
  motifIndex: number,
): { x: number; y: number } {
  validateCount(count)
  const motifs = motifCountForFriends(count)
  if (!Number.isSafeInteger(motifIndex) || motifIndex < 0 || motifIndex >= motifs) {
    throw new RangeError('Invalid motif index.')
  }
  const angle = -Math.PI / 2 + TAU * motifIndex / motifs
  const radius = outerRadiusForFriends(count) - 12
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  }
}

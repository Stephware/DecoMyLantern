/**
 * Ligligan Parul-inspired growth grammar.
 *
 * A complete circular/floral festival lantern exists at zero friends.
 * Every friend advances THREE true geometric growth layers, with only one
 * visible outer contour after each three layers. Fifteen themed regions span
 * the first 150 growth layers, maintaining an evolving festival parol.
 */
export type OuterDesignKey =
  | 'classic' | 'floral' | 'festival'
  | 'celestial' | 'fiesta' | 'sampaguita'

export type Motif = 'diamond' | 'flower' | 'fan' | 'star' | 'sun' | 'jasmine'
export type GrowthZone = 'siku' | 'mosaic' | 'palimbun' | 'ceremonial' | 'puntetas'
  | 'lattice' | 'rosette' | 'pinwheel' | 'prism' | 'peacock'
  | 'sunwheel' | 'sampaguita' | 'zigzag' | 'kaleidoscope' | 'corona'

export type OuterDesignRecipe = {
  key: OuterDesignKey
  motif: Motif
  name: string
}

export const OUTER_RECIPES: Readonly<Record<OuterDesignKey, OuterDesignRecipe>> = {
  classic: { key: 'classic', motif: 'diamond', name: 'Classic Gold' },
  floral: { key: 'floral', motif: 'flower', name: 'Floral Bloom' },
  festival: { key: 'festival', motif: 'fan', name: 'Festival Lights' },
  celestial: { key: 'celestial', motif: 'star', name: 'Celestial Lace' },
  fiesta: { key: 'fiesta', motif: 'sun', name: 'Radiant Fiesta' },
  sampaguita: { key: 'sampaguita', motif: 'jasmine', name: 'Sampaguita Glow' },
}

export const PAROL_CENTER = { x: 300, y: 302 } as const
export const BASE_FESTIVAL_RADIUS = 164
export const FRIEND_LAYER_SPACING = 10.5
export const PANEL_SEGMENTS = 20
export const GROWTH_PER_FRIEND = 3
export const DESIGN_GROWTH_TARGET = 150

export function growthForFriends(friends: number): number {
  assertFriendCount(friends)
  if (friends > Math.floor(Number.MAX_SAFE_INTEGER / GROWTH_PER_FRIEND)) {
    throw new RangeError('Friend count is too large to convert to growth layers.')
  }
  return friends * GROWTH_PER_FRIEND
}

export function isFriendBoundary(layerIndex: number): boolean {
  assertFriendCount(layerIndex)
  return layerIndex > 0 && layerIndex % GROWTH_PER_FRIEND === 0
}
const TAU = Math.PI * 2
const SAMPLES = 200

export type Point = { x: number; y: number }
export type FestivalLayer = {
  friendNumber: number
  innerRadius: number
  outerRadius: number
  zone: GrowthZone
}

export const GROWTH_REGIONS = [
  { zone: 'siku', from: 1, to: 10, label: 'Siku-siku diamonds' },
  { zone: 'mosaic', from: 11, to: 20, label: 'Capiz mosaic transition' },
  { zone: 'palimbun', from: 21, to: 35, label: 'Palimbun floral fans' },
  { zone: 'ceremonial', from: 36, to: 45, label: 'Ceremonial starbursts' },
  { zone: 'puntetas', from: 46, to: 50, label: 'Puntetas illuminated edging' },
  { zone: 'lattice', from: 51, to: 60, label: 'Woven capiz lattice' },
  { zone: 'rosette', from: 61, to: 70, label: 'Radiant floral rosettes' },
  { zone: 'pinwheel', from: 71, to: 80, label: 'Festival pinwheels' },
  { zone: 'prism', from: 81, to: 90, label: 'Prismatic diamonds' },
  { zone: 'peacock', from: 91, to: 100, label: 'Feathered fans' },
  { zone: 'sunwheel', from: 101, to: 110, label: 'Suns and rays' },
  { zone: 'sampaguita', from: 111, to: 120, label: 'Sampaguita garlands' },
  { zone: 'zigzag', from: 121, to: 130, label: 'Chevron embroidery' },
  { zone: 'kaleidoscope', from: 131, to: 140, label: 'Kaleidoscope tessellation' },
  { zone: 'corona', from: 141, to: 150, label: 'Celebration crown' },
] as const

export function assertFriendCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
}

export function growthZoneForLayer(friendNumber: number): GrowthZone {
  if (!Number.isSafeInteger(friendNumber) || friendNumber < 1) {
    throw new RangeError('A contributed structural layer starts at friend one.')
  }
  if (friendNumber <= 10) return 'siku'
  if (friendNumber <= 20) return 'mosaic'
  if (friendNumber <= 35) return 'palimbun'
  if (friendNumber <= 45) return 'ceremonial'
  if (friendNumber <= 50) return 'puntetas'
  for (const region of GROWTH_REGIONS.slice(5)) {
    if (friendNumber <= region.to) return region.zone
  }
  return 'corona'
}

export function outerRadiusForFriends(count: number): number {
  assertFriendCount(count)
  return BASE_FESTIVAL_RADIUS + count * FRIEND_LAYER_SPACING
}

export function outerFitZoom(count: number): number {
  // Extra sculpted petals after layer 50 must also fit within the viewBox.
  return Math.min(1, 279 / (festivalMaxExtent(count) + 2))
}

/**
 * A softly scalloped perimeter with fivefold symmetric flowers.
 * Amplitude grows gradually, at less than a single layer's width per friend;
 * boundaries therefore cannot cross one another.
 */
export function festivalPointAt(layerIndex: number, angle: number): Point {
  assertFriendCount(layerIndex)
  if (!Number.isFinite(angle)) throw new RangeError('Angle must be finite.')
  const progress = Math.min(layerIndex, 50) / 50
  const grand = Math.min(1, Math.max(0, (layerIndex - 50) / 100))
  // Continue sculpting the silhouette from layers 51-150 instead of
  // stopping at 50. Slow morphing keeps all successive contours nested.
  const amplitude = (4 + 14 * progress + 5 * grand) * Math.cos(angle * 10) +
    (2 + 6 * progress) * Math.cos(angle * 20) +
    6 * progress * Math.cos(angle * 5) +
    grand * (7 * Math.cos(angle * 30) + 5 * Math.cos(angle * 40) +
      3 * Math.cos(angle * 60))
  const radius = outerRadiusForFriends(layerIndex) + amplitude
  return {
    x: PAROL_CENTER.x + Math.cos(angle) * radius,
    y: PAROL_CENTER.y + Math.sin(angle) * radius,
  }
}

export function festivalOutlinePath(layerIndex: number, reverse = false): string {
  assertFriendCount(layerIndex)
  const points = Array.from({ length: SAMPLES }, (_, index) => {
    const i = reverse ? SAMPLES - 1 - index : index
    const angle = -Math.PI / 2 + i * TAU / SAMPLES
    const p = festivalPointAt(layerIndex, angle)
    return `${p.x.toFixed(3)} ${p.y.toFixed(3)}`
  })
  return `M ${points.join(' L ')} Z`
}

/** An actual FILLED structural layer: the exact area between two outlines. */
export function festivalBandPath(friendNumber: number): string {
  growthZoneForLayer(friendNumber)
  return `${festivalOutlinePath(friendNumber)} ${festivalOutlinePath(friendNumber - 1, true)}`
}

export function festivalFacetPath(friendNumber: number, panel: number): string {
  growthZoneForLayer(friendNumber)
  if (!Number.isSafeInteger(panel) || panel < 0 || panel >= PANEL_SEGMENTS) {
    throw new RangeError('Invalid lantern glass-panel sector.')
  }
  const a0 = -Math.PI / 2 + panel * TAU / PANEL_SEGMENTS
  const a1 = -Math.PI / 2 + (panel + 1) * TAU / PANEL_SEGMENTS
  const points = [
    festivalPointAt(friendNumber - 1, a0),
    festivalPointAt(friendNumber, a0),
    festivalPointAt(friendNumber, a1),
    festivalPointAt(friendNumber - 1, a1),
  ]
  return 'M ' + points.map(p => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' L ') + ' Z'
}

export function festivalLayers(friendCount: number): readonly FestivalLayer[] {
  assertFriendCount(friendCount)
  return Array.from({ length: friendCount }, (_, i) => ({
    friendNumber: i + 1,
    innerRadius: outerRadiusForFriends(i),
    outerRadius: outerRadiusForFriends(i + 1),
    zone: growthZoneForLayer(i + 1),
  }))
}

export function festivalMotifPoint(layerIndex: number, sector: number, sectors = 10): Point {
  assertFriendCount(layerIndex)
  if (!Number.isSafeInteger(sectors) || sectors < 1 ||
      !Number.isSafeInteger(sector) || sector < 0 || sector >= sectors) {
    throw new RangeError('Invalid motif sector.')
  }
  const angle = -Math.PI / 2 + TAU * sector / sectors
  return festivalPointAt(layerIndex, angle)
}

/** A motif sits in the physical middle of its own structural band. */
export function bandMotifPoint(friendNumber: number, sector: number, sectors = 10): Point {
  growthZoneForLayer(friendNumber)
  if (!Number.isSafeInteger(sectors) || sectors < 1 ||
      !Number.isSafeInteger(sector) || sector < 0 || sector >= sectors) {
    throw new RangeError('Invalid band motif sector.')
  }
  const angle = -Math.PI / 2 + TAU * (sector + .5) / sectors
  const a = festivalPointAt(friendNumber - 1, angle)
  const b = festivalPointAt(friendNumber, angle)
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Panel geometry spanning only what has actually been contributed so far. */
export function regionPanelPath(firstLayer: number, lastLayer: number, sector: number): string {
  if (!Number.isSafeInteger(firstLayer) || firstLayer < 1 ||
      !Number.isSafeInteger(lastLayer) || lastLayer < firstLayer) {
    throw new RangeError('Invalid completed decorative region.')
  }
  if (!Number.isSafeInteger(sector) || sector < 0 || sector >= 10) {
    throw new RangeError('Decorative regions contain ten repeated sectors.')
  }
  const a = -Math.PI / 2 + sector * TAU / 10
  const half = TAU / 20
  const center = a + half
  const inner = firstLayer - 1
  const p0 = festivalPointAt(inner, a + .065)
  const p1 = festivalPointAt(lastLayer, a + .065)
  const peak = festivalPointAt(lastLayer, center)
  const p2 = festivalPointAt(lastLayer, a + TAU / 10 - .065)
  const p3 = festivalPointAt(inner, a + TAU / 10 - .065)
  const cp = festivalPointAt(inner, center)
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}
    Q ${peak.x.toFixed(2)} ${peak.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}
    L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}
    Q ${cp.x.toFixed(2)} ${cp.y.toFixed(2)} ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} Z`
}

/** Conservative geometric bound, including the new floral lobes after layer 50. */
export function festivalMaxExtent(layerIndex: number): number {
  assertFriendCount(layerIndex)
  const grand = Math.min(1, Math.max(0, (layerIndex - 50) / 100))
  return outerRadiusForFriends(layerIndex) + 36 + 16 * grand
}

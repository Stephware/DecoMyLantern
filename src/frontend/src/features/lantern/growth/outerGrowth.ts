/**
 * BeMyParol: every accepted friend creates one REAL decorated, nested,
 * five-pointed outer star layer. These bands share edges, leaving no hollow
 * circular frame around the original star.
 *
 * Only the count changes layer geometry. Contributed light positions continue
 * to depend exclusively on persisted Contribution.SlotIndex.
 */
export type OuterDesignKey =
  | 'classic' | 'floral' | 'festival'
  | 'celestial' | 'fiesta' | 'sampaguita'

export type OuterDesignRecipe = {
  key: OuterDesignKey
  motif: 'diamond' | 'petal' | 'fan' | 'star' | 'sun' | 'jasmine'
  name: string
}

export const OUTER_RECIPES: Readonly<Record<OuterDesignKey, OuterDesignRecipe>> = {
  classic: { key: 'classic', motif: 'diamond', name: 'Classic Gold' },
  floral: { key: 'floral', motif: 'petal', name: 'Floral Bloom' },
  festival: { key: 'festival', motif: 'fan', name: 'Festival Lights' },
  celestial: { key: 'celestial', motif: 'star', name: 'Celestial Lace' },
  fiesta: { key: 'fiesta', motif: 'sun', name: 'Radiant Fiesta' },
  sampaguita: { key: 'sampaguita', motif: 'jasmine', name: 'Sampaguita Glow' },
}

export const STAR_CENTER = { x: 300, y: 302 } as const
export const BASE_STAR_RADIUS = 158
export const FRIEND_LAYER_SPACING = 14
// Match the existing capiz core's 158-point/74-notch star proportions.
export const STAR_NOTCH_RATIO = 74 / BASE_STAR_RADIUS
const TWO_PI = Math.PI * 2

export type StarPoint = { x: number; y: number }
export type FriendStarLayer = {
  friendNumber: number
  innerRadius: number
  outerRadius: number
}

export function assertFriendCount(friendCount: number): void {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0) {
    throw new RangeError('Friend count must be a non-negative safe integer.')
  }
}

export function friendStarLayers(friendCount: number): readonly FriendStarLayer[] {
  assertFriendCount(friendCount)
  return Array.from({ length: friendCount }, (_, index) => ({
    friendNumber: index + 1,
    innerRadius: outerRadiusForFriends(index),
    outerRadius: outerRadiusForFriends(index + 1),
  }))
}

export function outerRadiusForFriends(friendCount: number): number {
  assertFriendCount(friendCount)
  // No saturation at 50. Exactly one new external band for each friend.
  return BASE_STAR_RADIUS + friendCount * FRIEND_LAYER_SPACING
}

export function outerFitZoom(friendCount: number): number {
  const radius = outerRadiusForFriends(friendCount)
  // The top cap + hanging loop is at radius + 72. The lowest ribbons start
  // on the two bottom star points (sin 54°) and descend roughly 140 units.
  const topExtent = radius + 76
  const bottomExtent = radius * Math.sin(54 * Math.PI / 180) + 164
  const horizontalExtent = radius * Math.cos(18 * Math.PI / 180) + 18
  return Math.min(1, 281 / topExtent, 289 / bottomExtent, 283 / horizontalExtent)
}

export function starVertices(radius: number): readonly StarPoint[] {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError('Star radius must be finite and non-negative.')
  }
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5
    const r = index % 2 === 0 ? radius : radius * STAR_NOTCH_RATIO
    return {
      x: STAR_CENTER.x + Math.cos(angle) * r,
      y: STAR_CENTER.y + Math.sin(angle) * r,
    }
  })
}

export function starOutlinePath(radius: number): string {
  const vertices = starVertices(radius)
  return 'M ' + vertices.map(({ x, y }) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L ') + ' Z'
}

/** One unbroken filled star-shaped band, with a star-shaped transparent hole. */
export function friendStarBandPath(friendNumber: number): string {
  if (!Number.isSafeInteger(friendNumber) || friendNumber < 1) {
    throw new RangeError('Star layers are numbered from one.')
  }
  return `${starOutlinePath(outerRadiusForFriends(friendNumber))} ${starOutlinePath(outerRadiusForFriends(friendNumber - 1))}`
}

/** Each layer is a mosaic of ten connected quadrilaterals, not a bare ring. */
export function friendStarFacetPath(friendNumber: number, segment: number): string {
  if (!Number.isSafeInteger(friendNumber) || friendNumber < 1) {
    throw new RangeError('Star layers are numbered from one.')
  }
  if (!Number.isSafeInteger(segment) || segment < 0 || segment >= 10) {
    throw new RangeError('A five-point star has exactly ten edge segments.')
  }
  const inner = starVertices(outerRadiusForFriends(friendNumber - 1))
  const outer = starVertices(outerRadiusForFriends(friendNumber))
  const next = (segment + 1) % 10
  const corners = [inner[segment], outer[segment], outer[next], inner[next]]
  return 'M ' + corners.map(({ x, y }) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L ') + ' Z'
}

export function starTipPosition(
  friendNumber: number,
  sector: number,
  fraction = 0.5,
): StarPoint {
  if (!Number.isSafeInteger(friendNumber) || friendNumber < 1) {
    throw new RangeError('Star layers are numbered from one.')
  }
  if (!Number.isSafeInteger(sector) || sector < 0 || sector >= 5) {
    throw new RangeError('A star has five major tips.')
  }
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError('Fraction must be between zero and one.')
  }
  const radius = outerRadiusForFriends(friendNumber - 1) + FRIEND_LAYER_SPACING * fraction
  const angle = -Math.PI / 2 + sector * TWO_PI / 5
  return { x: STAR_CENTER.x + Math.cos(angle) * radius,
    y: STAR_CENTER.y + Math.sin(angle) * radius }
}

export function starNotchPosition(
  friendNumber: number,
  sector: number,
): StarPoint {
  if (!Number.isSafeInteger(friendNumber) || friendNumber < 1) {
    throw new RangeError('Star layers are numbered from one.')
  }
  if (!Number.isSafeInteger(sector) || sector < 0 || sector >= 5) {
    throw new RangeError('A star has five notches.')
  }
  const angle = -Math.PI / 2 + (sector + 0.5) * TWO_PI / 5
  const radius = (outerRadiusForFriends(friendNumber - 1) +
    FRIEND_LAYER_SPACING / 2) * STAR_NOTCH_RATIO
  return { x: STAR_CENTER.x + Math.cos(angle) * radius,
    y: STAR_CENTER.y + Math.sin(angle) * radius }
}

export function lowerRibbonAnchors(friendCount: number): readonly StarPoint[] {
  const radius = outerRadiusForFriends(friendCount)
  // Five string attachments follow the V-shaped lower outline of the
  // outermost star, rather than remaining fixed under the original core.
  return [-2, -1, 0, 1, 2].map(index => {
    const proportion = Math.abs(index) / 2
    return {
      x: STAR_CENTER.x + (index / 2) * radius * Math.cos(54 * Math.PI / 180),
      y: STAR_CENTER.y + radius * (
        STAR_NOTCH_RATIO * (1 - proportion) + Math.sin(54 * Math.PI / 180) * proportion),
    }
  })
}

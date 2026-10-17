/**
 * DESIGN LAB ONLY. These formulas preview an alternative where every accepted
 * friend adds one complete outer ring. They do not alter saved contributions,
 * design access, or the production LanternScene renderer.
 */
export const PREVIEW_MAX_FRIENDS = 60
export const DESIGN_MILESTONES = [0, 3, 10, 23, 40, 50] as const

const FIRST_RING_RADIUS = 194
const RING_SPACING = 14
const FIT_HALF_EXTENT = 318
const FIT_MARGIN_PER_FRIEND = 14

export function ringRadius(slotIndex: number): number {
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0) {
    throw new RangeError('Ring slot index must be a non-negative safe integer.')
  }
  return FIRST_RING_RADIUS + slotIndex * RING_SPACING
}

/** Shrink the whole preview after each added ring; allow counts past 50. */
export function ringAutoFitScale(friendCount: number): number {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0) {
    throw new RangeError('Friend count must be a non-negative safe integer.')
  }
  return FIT_HALF_EXTENT / (FIT_HALF_EXTENT + friendCount * FIT_MARGIN_PER_FRIEND)
}

export function lastReachedMilestone(friendCount: number): number {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0) {
    throw new RangeError('Friend count must be a non-negative safe integer.')
  }
  return [...DESIGN_MILESTONES].reverse().find(value => friendCount >= value) ?? 0
}

export function nextMilestone(friendCount: number): number | null {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0) {
    throw new RangeError('Friend count must be a non-negative safe integer.')
  }
  return DESIGN_MILESTONES.find(value => value > friendCount) ?? null
}

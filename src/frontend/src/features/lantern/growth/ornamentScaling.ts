/**
 * The original flower is the visual reference. Later regions contain
 * different intrinsic shapes, so increasing their raw SVG scale by the same
 * percentage does not produce visibly larger ornaments.
 *
 * Normalize each complete motif to an actual outer-tip radius, then make
 * each next motif 8% larger. Earlier diamonds, mosaic and flower are unchanged.
 */
export const NEXT_ORNAMENT_SIZE_STEP = 1.06
export const FLOWER_REGION_INDEX = 2
export const LATER_ORNAMENT_SIZE_STEP = 1.08

// Max radial distance in local SVG units from each artwork's center.
// For regions 0-2 these bounds are informational; they are not rescaled.
export const REGION_MOTIF_EXTENTS: readonly number[] = [
  25, 26, 37, 33, 25, 29, 31, 35, 31, 34, 34, 31, 30, 31, 35,
]

export function ornamentWidthEmphasis(regionIndex: number): number {
  if (!Number.isSafeInteger(regionIndex) ||
    regionIndex < 0 || regionIndex >= REGION_MOTIF_EXTENTS.length)
    throw new RangeError('Unknown decorative region.')
  return NEXT_ORNAMENT_SIZE_STEP ** regionIndex
}

// The original completed five-petal flower had scale min(3.1, ...) * 1.06^2.
export const FLOWER_VISUAL_RADIUS =
  REGION_MOTIF_EXTENTS[FLOWER_REGION_INDEX] * 3.1 *
  ornamentWidthEmphasis(FLOWER_REGION_INDEX)

/** Final intrinsic SVG radius (not a percentage of the entire parol). */
export function completedMotifVisualRadius(regionIndex: number): number {
  ornamentWidthEmphasis(regionIndex) // Validate before use.
  return FLOWER_VISUAL_RADIUS * LATER_ORNAMENT_SIZE_STEP **
    Math.max(0, regionIndex - FLOWER_REGION_INDEX)
}

/** Complete motif scale for each region after the original flower. */
export function laterMotifScale(regionIndex: number): number {
  if (regionIndex <= FLOWER_REGION_INDEX)
    throw new RangeError('Only post-flower motifs use normalized sizing.')
  return completedMotifVisualRadius(regionIndex) / REGION_MOTIF_EXTENTS[regionIndex]
}

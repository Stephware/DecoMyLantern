/**
 * A new completed decorative design is slightly more prominent than the one
 * before it. Its width and height now increase proportionally, and each
 * successive region has matching radial room for the larger ornament.
 * The original motif paths, region boundaries and three-wave timing remain.
 */
export const NEXT_ORNAMENT_SIZE_STEP = 1.06

export function ornamentWidthEmphasis(regionIndex: number): number {
  if (!Number.isSafeInteger(regionIndex) || regionIndex < 0 || regionIndex >= 15)
    throw new RangeError('Unknown decorative region.')
  return NEXT_ORNAMENT_SIZE_STEP ** regionIndex
}

/**
 * The palimbun flower (layers 21-35) is the last established design we leave
 * untouched. Its five petals extend roughly 37 local SVG units from center.
 * Its existing complete-region scale reaches 3.1 * 1.06^2.
 *
 * Later SVG motifs have DIFFERENT intrinsic dimensions: the narrow puntetas
 * star, for example, cannot be compared with the flower by scale() alone.
 * Normalize each motif by its own outer tip radius before growing it.
 */
export const FLOWER_REGION_INDEX = 2
export const FLOWER_REFERENCE_RADIUS =
  37 * 3.1 * ornamentWidthEmphasis(FLOWER_REGION_INDEX)
export const POST_FLOWER_SIZE_STEP = 1.07
export const POST_FLOWER_CLEARANCE = 1.10

// Radius of the original motif artwork, before SVG scaling, by region index.
// The first three entries are reference-only; their current rendering stays.
export const REGION_MOTIF_RADIUS: readonly number[] = [
  25, 26, 37, 33, 25, 29, 31, 35, 31, 34, 34, 31, 30, 31, 35,
]

export function completedOrnamentRadius(regionIndex: number): number {
  ornamentWidthEmphasis(regionIndex) // Validate the region.
  if (regionIndex < FLOWER_REGION_INDEX) {
    throw new RangeError('The progression starts at the completed flower.')
  }
  return FLOWER_REFERENCE_RADIUS *
    POST_FLOWER_SIZE_STEP ** (regionIndex - FLOWER_REGION_INDEX)
}

/** SVG scale giving later original motif shapes their intended visual radius. */
export function completedOuterOrnamentScale(regionIndex: number): number {
  if (regionIndex <= FLOWER_REGION_INDEX)
    throw new RangeError('Only ornaments after the flower are normalized.')
  return completedOrnamentRadius(regionIndex) / REGION_MOTIF_RADIUS[regionIndex]
}

/** No new empty gap: the new region's own filled bands gain adequate depth. */
export function minimumOuterRegionDepth(regionIndex: number): number {
  if (regionIndex <= FLOWER_REGION_INDEX) return 0
  return 2 * completedOrnamentRadius(regionIndex) * POST_FLOWER_CLEARANCE
}

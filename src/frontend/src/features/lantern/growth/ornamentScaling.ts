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

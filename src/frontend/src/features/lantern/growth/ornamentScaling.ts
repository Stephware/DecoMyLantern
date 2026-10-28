/**
 * A new completed decorative design is slightly more prominent than the one
 * before it. Only the ornament's tangential (side-to-side) dimension changes;
 * structural rings, radial spacing and three-wave growth stay untouched.
 */
export const NEXT_ORNAMENT_SIZE_STEP = 1.06

export function ornamentWidthEmphasis(regionIndex: number): number {
  if (!Number.isSafeInteger(regionIndex) || regionIndex < 0 || regionIndex >= 15)
    throw new RangeError('Unknown decorative region.')
  return NEXT_ORNAMENT_SIZE_STEP ** regionIndex
}

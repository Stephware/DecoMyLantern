/**
 * A light's position depends ONLY on its persisted SlotIndex.
 * Never include accepted-friend count, design, palette, growth stage, or array position
 * in this calculation. Removed contributions leave gaps instead of shifting others.
 */
export type LightPosition = { x: number; y: number; radius: number }

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const CENTER_X = 300
const CENTER_Y = 302

export function lightPosition(slotIndex: number): LightPosition {
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0) {
    throw new RangeError('A contribution slot must be a non-negative safe integer.')
  }

  const angle = slotIndex * GOLDEN_ANGLE - Math.PI / 2
  const distance = Math.min(132, 25 + Math.sqrt(slotIndex) * 10.5)
  return {
    x: CENTER_X + Math.cos(angle) * distance,
    y: CENTER_Y + Math.sin(angle) * distance,
    radius: Math.max(2.7, 5 - Math.floor(slotIndex / 80) * 0.25),
  }
}

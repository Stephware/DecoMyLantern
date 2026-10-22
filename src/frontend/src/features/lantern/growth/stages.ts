export type GrowthStage = {
  key: 'base' | 'floral' | 'festival' | 'celestial' | 'fiesta' | 'sampaguita'
  name: string
  /** Friend count needed to unlock this selectable design. */
  minFriends: number
}

// The final DESIGN milestone is 50; actual parol growth continues beyond 50.
export const DESIGN_TARGET_FRIENDS = 50
export const MAX_TEST_FRIENDS = 60
export const STAGES: readonly GrowthStage[] = [
  { key: 'base', name: 'Classic Gold', minFriends: 0 },
  { key: 'floral', name: 'Floral Bloom', minFriends: 3 },
  { key: 'festival', name: 'Festival Lights', minFriends: 10 },
  { key: 'celestial', name: 'Celestial Lace', minFriends: 23 },
  { key: 'fiesta', name: 'Radiant Fiesta', minFriends: 40 },
  { key: 'sampaguita', name: 'Sampaguita Glow', minFriends: 50 },
]

export function stageForFriends(count: number): GrowthStage {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
  return [...STAGES].reverse().find(stage => count >= stage.minFriends) ?? STAGES[0]
}

export function nextDesignMilestone(count: number): GrowthStage | null {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
  return STAGES.find(stage => stage.minFriends > count) ?? null
}

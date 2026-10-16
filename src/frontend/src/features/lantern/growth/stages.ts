export type GrowthStage = {
  key: 'base' | 'lights' | 'details' | 'fuller' | 'grand'
  name: string
  /** Start of a visual range, never an unlock or permission requirement. */
  minFriends: number
}

// Full visual crown target, not a limit on real accepted contributions.
export const DESIGN_TARGET_FRIENDS = 50

export const STAGES: readonly GrowthStage[] = [
  { key: 'base', name: 'Complete Base', minFriends: 0 },
  { key: 'lights', name: 'Added Lights', minFriends: 1 },
  { key: 'details', name: 'More Details', minFriends: 6 },
  { key: 'fuller', name: 'Fuller Layers', minFriends: 16 },
  { key: 'grand', name: 'Grand Parol', minFriends: 31 },
]

export function stageForFriends(count: number): GrowthStage {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
  return [...STAGES].reverse().find(stage => count >= stage.minFriends) ?? STAGES[0]
}

/**
 * Each friend from #6 to #50 adds exactly one new outer accent.
 * The first five are represented by their actual contributed lights.
 * The renderer does not reject counts over 50: the grand design holds its
 * full accents while further persisted contributor lights remain visible.
 */
export function decorationCounts(count: number) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Accepted friend count must be a non-negative safe integer.')
  }
  return {
    details: Math.min(Math.max(count - 5, 0), 10),
    fuller: Math.min(Math.max(count - 15, 0), 15),
    grand: Math.min(Math.max(count - 30, 0), 20),
  }
}

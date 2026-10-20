/** One accepted contribution produces three visual steps inside one filled band. */
export const POINTS_PER_FRIEND = 3
export const GROWTH_STEP_DURATIONS = [500, 700, 600] as const

export type GrowthPhase = 0 | 1 | 2 | 3

export type GrowthAnimationState = {
  completedFriends: number
  targetFriends: number
  phase: GrowthPhase
}

export function growthPointsForFriends(friends: number): number {
  if (!Number.isSafeInteger(friends) || friends < 0 ||
      friends > Math.floor(Number.MAX_SAFE_INTEGER / POINTS_PER_FRIEND)) {
    throw new RangeError('Accepted friend count is outside the supported growth range.')
  }
  return friends * POINTS_PER_FRIEND
}

export function completedGrowth(friends: number): GrowthAnimationState {
  growthPointsForFriends(friends)
  return { completedFriends: friends, targetFriends: friends, phase: 0 }
}

export function growthPointsDuring(animation: GrowthAnimationState): number {
  return growthPointsForFriends(animation.completedFriends) + animation.phase
}

export function visibleGrowthBands(animation: GrowthAnimationState): number {
  return animation.completedFriends + (animation.phase === 0 ? 0 : 1)
}

/** A fresh visit or a large preview jump never replays historical growth. */
export function retargetGrowth(
  current: GrowthAnimationState, friends: number, instant: boolean,
): GrowthAnimationState {
  growthPointsForFriends(friends)
  if (instant || friends < current.targetFriends || friends < current.completedFriends) {
    return completedGrowth(friends)
  }
  if (friends === current.targetFriends) return current
  return {
    ...current,
    targetFriends: friends,
    phase: current.phase === 0 && friends > current.completedFriends ? 1 : current.phase,
  }
}

export function advanceGrowth(current: GrowthAnimationState): GrowthAnimationState {
  if (current.phase === 0) return current
  if (current.phase < 3) {
    return { ...current, phase: (current.phase + 1) as GrowthPhase }
  }
  const completedFriends = current.completedFriends + 1
  return {
    completedFriends,
    targetFriends: current.targetFriends,
    phase: completedFriends < current.targetFriends ? 1 : 0,
  }
}

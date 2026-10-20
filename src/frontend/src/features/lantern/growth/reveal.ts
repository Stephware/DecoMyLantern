import { growthForFriends } from './outerGrowth'

/** One real contribution reveals three entire structural growth layers. */
export const STEP_DURATIONS_MS = [750, 850, 1100] as const

export type RevealStep = 0 | 1 | 2 | 3

export type GrowthReveal = {
  completedFriends: number
  targetFriends: number
  step: RevealStep
}

export function settledGrowth(friends: number): GrowthReveal {
  growthForFriends(friends)
  return { completedFriends: friends, targetFriends: friends, step: 0 }
}

export function visibleGrowth(reveal: GrowthReveal): number {
  return growthForFriends(reveal.completedFriends) + reveal.step
}

export function visibleFriends(reveal: GrowthReveal): number {
  return reveal.completedFriends + (reveal.step === 3 ? 1 : 0)
}

export function retargetGrowth(reveal: GrowthReveal, target: number, instant: boolean): GrowthReveal {
  growthForFriends(target)
  if (instant || target < reveal.completedFriends || target < reveal.targetFriends) {
    return settledGrowth(target)
  }
  if (target === reveal.targetFriends) return reveal
  return {
    ...reveal,
    targetFriends: target,
    step: reveal.step === 0 ? 1 : reveal.step,
  }
}

export function nextGrowthStep(reveal: GrowthReveal): GrowthReveal {
  if (reveal.step === 0) return reveal
  if (reveal.step < 3) return { ...reveal, step: (reveal.step + 1) as RevealStep }
  const completedFriends = reveal.completedFriends + 1
  return {
    completedFriends,
    targetFriends: reveal.targetFriends,
    step: completedFriends < reveal.targetFriends ? 1 : 0,
  }
}

export type GrowthStage = {
  key: 'base' | 'enhanced' | 'radiant' | 'grand'
  name: string
  requiredFriends: number
  radius: number
}

export const STAGES: readonly GrowthStage[] = [
  { key: 'base', name: 'First Light', requiredFriends: 0, radius: 172 },
  { key: 'enhanced', name: 'Glowing Star', requiredFriends: 5, radius: 198 },
  { key: 'radiant', name: 'Radiant Parol', requiredFriends: 15, radius: 228 },
  { key: 'grand', name: 'Grand Parol', requiredFriends: 30, radius: 252 },
]

export function stageForFriends(count: number): GrowthStage {
  return [...STAGES].reverse().find(stage => count >= stage.requiredFriends) ?? STAGES[0]
}

export function nextStage(count: number): GrowthStage | undefined {
  return STAGES.find(stage => stage.requiredFriends > count)
}

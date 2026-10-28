// Pure timing contract shared by browser preview and deterministic MP4 renders.
export const STORY_FPS = 30
export const STORY_FRAMES = 240
export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920

export function storyGrowthAtFrame(friendCount: number, frame: number): number {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0)
    throw new RangeError('Friend count must be a non-negative integer.')
  const fullGrowth = Math.min(friendCount, 50) * 3
  const previous = Math.max(0, fullGrowth - 3)
  const stage = frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : 3
  return Math.min(fullGrowth, previous + stage)
}

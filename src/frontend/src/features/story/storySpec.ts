// Seconds are the canonical timeline. Presets only change sampling and raster size.
export const STORY_DURATION = 8
export const STORY_PRESETS = {
  standard: {width: 720, height: 1280, fps: 24},
  high: {width: 1080, height: 1920, fps: 30},
} as const
export type StoryPreset = keyof typeof STORY_PRESETS
export const STORY_WIDTH = STORY_PRESETS.standard.width
export const STORY_HEIGHT = STORY_PRESETS.standard.height
export const STORY_FPS = STORY_PRESETS.standard.fps
export const STORY_FRAMES = STORY_DURATION * STORY_FPS

export const STORY_TIMING = {
  stages: [0, 1, 2, 3],
  flashes: [1, 2, 3],
  flashDuration: 25 / 30,
  parolFade: [4 / 30, 26 / 30],
  textFade: [155 / 30, 181 / 30],
  headerFadeEnd: 24 / 30,
  zoom: {start: 96 / 30, end: 151 / 30, from: 1.12, to: 1},
} as const

export const storyFrameAt = (seconds: number, fps: number = STORY_FPS) => Math.round(seconds * fps)
export const storySecondsAt = (frame: number, fps: number = STORY_FPS) => frame / fps

export function storyGrowthAtFrame(friendCount: number, frame: number, fps: number = STORY_FPS): number {
  if (!Number.isSafeInteger(friendCount) || friendCount < 0)
    throw new RangeError('Friend count must be a non-negative integer.')
  const fullGrowth = Math.min(friendCount, 50) * 3
  const previous = Math.max(0, fullGrowth - 3)
  const seconds = storySecondsAt(frame, fps)
  const stage = seconds < 1 ? 0 : seconds < 2 ? 1 : seconds < 3 ? 2 : 3
  return Math.min(fullGrowth, previous + stage)
}

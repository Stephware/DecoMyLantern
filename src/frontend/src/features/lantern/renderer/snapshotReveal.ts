import { STEP_DURATIONS_MS } from '../growth/reveal.ts'

/**
 * Reuse the original three-wave timing with a single finished WebP image.
 * The sweep is a visual reveal, not a fabricated intermediate SVG state.
 */
export const SNAPSHOT_WAVE_DURATIONS_MS = STEP_DURATIONS_MS
export type SnapshotWave = 1 | 2 | 3

// CSS clip-path circle radii, relative to the already-fitted 600x640 image.
export const SNAPSHOT_WAVE_RADIUS: Readonly<Record<SnapshotWave, number>> = {
  1: 22,
  2: 40,
  3: 82,
}
export const SNAPSHOT_WAVE_LABEL: Readonly<Record<SnapshotWave, string>> = {
  1: 'First wave — a new light begins to glow',
  2: 'Second wave — the lantern illuminates outward',
  3: 'Third wave — your completed parol shines',
}

export type SnapshotIdentity = {
  source: string
  designKey: string
  patternKey: string
  friendCount: number
}

/**
 * Only a single real newly accepted friend gets the 3-wave animation.
 * Design changes, rapid jumps, initial page loads, tab-return catchups and
 * reduced-motion users receive the completed image immediately instead.
 */
export function shouldAnimateSnapshot(
  previous: SnapshotIdentity | null,
  next: SnapshotIdentity,
  options: {
    hidden: boolean
    reducedMotion: boolean
    recentlyReturned: boolean
    alreadyAnimating: boolean
  },
): boolean {
  return previous !== null &&
    previous.source === next.source &&
    previous.designKey === next.designKey &&
    previous.patternKey === next.patternKey &&
    next.friendCount === previous.friendCount + 1 &&
    !options.hidden && !options.reducedMotion &&
    !options.recentlyReturned && !options.alreadyAnimating
}

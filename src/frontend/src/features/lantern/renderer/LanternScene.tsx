import { lazy, Suspense } from 'react'
import type { Theme } from '../../customization/themes'
import CachedParolScene from './CachedParolScene'

/** Light labels stay in the UI only; never included in generated image data. */
export type LanternLight = { id: string; slotIndex: number; displayName: string }

export type SavedParolSource =
  | { kind: 'owner'; stateId: string }
  | { kind: 'guest'; stateId: string; token: string }

// The SVG-heavy renderer is now a separate lazy-loaded Design Lab tool.
// Actual owner/guest parols are displayed as ONE cached server image.
const DesignLabPreview = lazy(() => import('./LegacyLanternPreview'))

type Props = {
  theme: Theme
  pattern?: string
  contributions?: readonly LanternLight[]
  /** Unsaved, synthetic states are strictly for the existing Design Lab. */
  previewCount?: number
  snapshot?: SavedParolSource
}

export default function LanternScene({
  theme, pattern = 'default', contributions = [], previewCount, snapshot,
}: Props) {
  if (previewCount !== undefined) {
    return (
      <Suspense fallback={<div role="status" className="py-16 text-center text-white/55">
        Preparing Design Lab preview…
      </div>}>
        <DesignLabPreview theme={theme} pattern={pattern}
          contributions={contributions} previewCount={previewCount} />
      </Suspense>
    )
  }

  // An unsaved parol cannot have a server-generated image.
  if (!snapshot) return <p role="status" className="py-12 text-center text-white/55">
    Create your parol to see its saved image.
  </p>

  return <CachedParolScene theme={theme} pattern={pattern}
    contributions={contributions} snapshot={snapshot} />
}

import { useEffect, useRef, useState } from 'react'
import type { Theme } from '../../customization/themes'
import { ApiError, fetchParolSnapshot } from '../../../lib/api'
import { snapshotRequestKey } from './snapshotState'
import { shouldAnimateSnapshot, SNAPSHOT_WAVE_DURATIONS_MS, SNAPSHOT_WAVE_LABEL,
  SNAPSHOT_WAVE_RADIUS, type SnapshotWave, type SnapshotIdentity } from './snapshotReveal'
import type { LanternLight, SavedParolSource } from './LanternScene'

type Props = {
  theme: Theme
  pattern: string
  contributions: readonly LanternLight[]
  friendCount: number
  snapshot: SavedParolSource
}

type RenderedImage = SnapshotIdentity & { key: string; url: string }
type ImageTransition = { next: RenderedImage; wave: SnapshotWave }


/**
 * Reveal the completed cached WebP in three lightweight image-mask waves.
 * No procedural parol SVGs are mounted in the real owner and guest viewers.
 */
export default function CachedParolScene({
  theme, contributions, friendCount, pattern, snapshot,
}: Props) {
  // The backend always re-reads the saved state. Only a meaningful change
  // to the owner, invitation or parol requests another flattened image.
  const stateKey = snapshotRequestKey(
    snapshot, theme.key, pattern, friendCount,
    contributions.map(light => light.slotIndex),
  )

  const [rendered, setRendered] = useState<RenderedImage | null>(null)
  const [transition, setTransition] = useState<ImageTransition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const ownedUrls = useRef<Set<string>>(new Set())
  const displayedRef = useRef<RenderedImage | null>(null)
  const transitionRef = useRef<ImageTransition | null>(null)
  const lastTabReturn = useRef(0)
  const source = snapshot.kind === 'owner'
    ? `owner:${snapshot.stateId}`
    : `guest:${snapshot.stateId}:${snapshot.token}`

  useEffect(() => { displayedRef.current = rendered }, [rendered])
  useEffect(() => { transitionRef.current = transition }, [transition])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        // Finishing an interrupted reveal never changes the saved parol data.
        const pending = transitionRef.current
        if (pending) {
          setRendered(pending.next)
          setTransition(null)
        }
      } else {
        lastTabReturn.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Two images only during a wave (previous + incoming); otherwise one.
  useEffect(() => {
    const all = ownedUrls.current
    return () => { for (const url of all) URL.revokeObjectURL(url); all.clear() }
  }, [])
  useEffect(() => {
    const needed = new Set([rendered?.url, transition?.next.url])
    for (const url of ownedUrls.current) {
      if (!needed.has(url)) {
        URL.revokeObjectURL(url)
        ownedUrls.current.delete(url)
      }
    }
  }, [rendered?.url, transition?.next.url])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError('')
    setTransition(null)

    async function load() {
      for (let tries = 0; tries < 3; tries++) {
        if (!active || controller.signal.aborted) return
        try {
          const blob = await fetchParolSnapshot(
            snapshot.kind,
            snapshot.kind === 'guest' ? snapshot.token : undefined,
            controller.signal,
          )
          if (!active || controller.signal.aborted) return
          const url = URL.createObjectURL(blob)
          ownedUrls.current.add(url)
          try {
            // A predecoded image cannot flash blank on the first wave.
            const img = new Image()
            img.src = url
            await img.decode()
          } catch (failure) {
            URL.revokeObjectURL(url)
            ownedUrls.current.delete(url)
            throw failure
          }
          if (!active || controller.signal.aborted) {
            URL.revokeObjectURL(url)
            ownedUrls.current.delete(url)
            return
          }

          const next: RenderedImage = {
            key: stateKey, url, source, designKey: theme.key,
            patternKey: pattern, friendCount,
          }
          const previous = displayedRef.current
          const animate = shouldAnimateSnapshot(previous, next, {
            hidden: document.hidden,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            recentlyReturned: lastTabReturn.current > 0 &&
              Date.now() - lastTabReturn.current < 6000,
            alreadyAnimating: transitionRef.current !== null,
          })
          if (animate) {
            setTransition({next, wave: 1})
          } else {
            setRendered(next)
            setTransition(null)
          }
          setLoading(false)
          setError('')
          return
        } catch (caught) {
          if (!active || controller.signal.aborted) return
          if (caught instanceof ApiError && caught.status === 503 && tries < 2) {
            await new Promise<void>(resolve => {
              const timer = window.setTimeout(resolve, (tries + 1) * 2000)
              controller.signal.addEventListener('abort', () => {
                window.clearTimeout(timer)
                resolve()
              }, {once: true})
            })
            continue
          }
          setError(caught instanceof Error ? caught.message : 'Unable to load the parol image.')
          setLoading(false)
          return
        }
      }
    }

    void load()
    return () => { active = false; controller.abort() }
  // stateKey contains all request arguments; attempt is the explicit Retry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, attempt])

  // Identical timing to the original 750ms / 850ms / 1100ms growth sequence.
  useEffect(() => {
    if (!transition) return
    const timer = window.setTimeout(() => {
      if (transition.wave === 3) {
        setRendered(transition.next)
        setTransition(null)
      } else {
        setTransition(current => current?.next.key === transition.next.key
          ? {...current, wave: (current.wave + 1) as SnapshotWave}
          : current)
      }
    }, SNAPSHOT_WAVE_DURATIONS_MS[transition.wave - 1])
    return () => window.clearTimeout(timer)
  }, [transition])

  // Never display another owner's or invitation's earlier image by mistake.
  const visibleImage = rendered?.source === source ? rendered : null
  const activeWave = transition?.next.key === stateKey ? transition : null
  const ready = visibleImage?.key === stateKey && activeWave === null
  return (
    <figure className="relative mx-auto w-full max-w-[710px]">
      <div aria-hidden="true"
        className="pointer-events-none absolute inset-x-[14%] top-[19%] aspect-square rounded-full bg-amber-300/5 blur-3xl" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/5 bg-[radial-gradient(ellipse_at_50%_42%,rgba(249,177,82,0.10),rgba(8,14,32,0)_65%)]">
        {/* Saved parols are real cached WebP files, not draggable canvases.
            Leave touch/pointer gestures to the browser for natural page scroll. */}
        <div className="relative aspect-[15/16] w-full select-none">
          {visibleImage && <img src={visibleImage.url} width={600} height={640}
            alt={`${theme.label} festival parol with ${friendCount} friends`}
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain" />}
          {activeWave && <>
            <img src={activeWave.next.url} width={600} height={640} alt=""
              aria-hidden="true" draggable={false}
              className="parol-snapshot-wave-reveal pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              style={{clipPath: `circle(${SNAPSHOT_WAVE_RADIUS[activeWave.wave]}% at 50% 47.2%)`}} />
            <svg viewBox="0 0 600 640" aria-hidden="true"
              className="parol-snapshot-wave-glint pointer-events-none absolute inset-0 h-full w-full">
              <circle key={activeWave.wave} cx="300" cy="302"
                r={activeWave.wave === 1 ? 135 : activeWave.wave === 2 ? 240 : 295}
                stroke="#ffe9a0" strokeWidth="7" fill="none" />
            </svg>
          </>}
        </div>
        {!visibleImage && !error && <div role="status"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-amber-100/80">
          Preparing your parol image…
        </div>}
        {loading && visibleImage && <div role="status"
          className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#101b33]/90 px-3 py-2 text-xs text-amber-100">
          Updating parol image…
        </div>}
        {error && <div role="alert"
          className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300/30 bg-[#101b33]/95 p-3 text-xs text-rose-100">
          <span>{error}{visibleImage ? ' Showing the previous image.' : ''}</span>
          <button type="button" className="rounded-lg border border-rose-200/40 px-3 py-2 font-semibold"
            onClick={() => setAttempt(n => n + 1)}>Retry</button>
        </div>}
      </div>
      <figcaption role="status" aria-live="polite" className="sr-only">
        {activeWave ? SNAPSHOT_WAVE_LABEL[activeWave.wave] :
          loading ? 'Loading parol…' :
          ready ? 'Parol ready' : 'Parol unavailable. Retry to refresh.'}
      </figcaption>
    </figure>
  )
}

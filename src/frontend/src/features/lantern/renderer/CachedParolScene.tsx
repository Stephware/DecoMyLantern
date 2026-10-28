import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { Theme } from '../../customization/themes'
import { ApiError, fetchParolSnapshot } from '../../../lib/api'
import { growthForFriends, outerFitZoom } from '../growth/outerGrowth'
import { lightPosition } from './lightPositions'
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

type Point = { x: number; y: number }
type Camera = { zoom: number; x: number; y: number }
type RenderedImage = SnapshotIdentity & { key: string; url: string }
type ImageTransition = { next: RenderedImage; wave: SnapshotWave }

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const WIDTH = 600
const HEIGHT = 640
const CENTER_X = 300
const CENTER_Y = 302
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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
  const [camera, setCamera] = useState<Camera>({ zoom: 1, x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef<Map<number, Point>>(new Map())
  const dragged = useRef(false)
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
    setSelectedId(null)
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
            setCamera({zoom: 1, x: 0, y: 0})
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
  const fit = outerFitZoom(growthForFriends(friendCount))
  const selected = contributions.find(light => light.id === selectedId)
  const selectedPoint = selected && ready ? lightPosition(selected.slotIndex) : null
  const transform = `translate(${CENTER_X + camera.x} ${CENTER_Y + camera.y}) scale(${camera.zoom}) translate(${-CENTER_X} ${-CENTER_Y})`

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pointers.current.size === 0) dragged.current = false
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const tracked = pointers.current
    const previous = tracked.get(event.pointerId)
    if (!previous) return
    const before = Array.from(tracked.values())
    tracked.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const after = Array.from(tracked.values())
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return

    if (after.length >= 2 && before.length >= 2) {
      const length = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const distanceBefore = length(before)
      const distanceAfter = length(after)
      const mid = (points: Point[]) => ({
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      })
      const oldMid = mid(before)
      const newMid = mid(after)
      dragged.current = true
      setCamera(old => ({
        zoom: clamp(old.zoom * (distanceBefore ? distanceAfter / distanceBefore : 1), MIN_ZOOM, MAX_ZOOM),
        x: clamp(old.x + (newMid.x - oldMid.x) * WIDTH / bounds.width, -300, 300),
        y: clamp(old.y + (newMid.y - oldMid.y) * HEIGHT / bounds.height, -320, 320),
      }))
    } else if (after.length === 1) {
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      if (Math.abs(dx) + Math.abs(dy) > 1) dragged.current = true
      setCamera(old => ({
        ...old,
        x: clamp(old.x + dx * WIDTH / bounds.width, -300, 300),
        y: clamp(old.y + dy * HEIGHT / bounds.height, -320, 320),
      }))
    }
  }

  function pointerEnd(event: PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function selectLight(event: MouseEvent<SVGSVGElement>) {
    if (dragged.current || !ready || !contributions.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = CENTER_X + ((event.clientX - rect.left) * WIDTH / rect.width - CENTER_X - camera.x) / camera.zoom
    const y = CENTER_Y + ((event.clientY - rect.top) * HEIGHT / rect.height - CENTER_Y - camera.y) / camera.zoom
    let closest: LanternLight | null = null
    let distance = Infinity
    for (const light of contributions) {
      const point = lightPosition(light.slotIndex)
      const px = CENTER_X + (point.x - CENTER_X) * fit
      const py = CENTER_Y + (point.y - CENTER_Y) * fit
      const d = Math.hypot(x - px, y - py)
      if (d < distance) { distance = d; closest = light }
    }
    setSelectedId(closest && distance <= 12 ? closest.id : null)
  }

  function selectNextLight() {
    if (!contributions.length) return
    const index = contributions.findIndex(light => light.id === selectedId)
    setSelectedId(contributions[(index + 1) % contributions.length].id)
  }

  return (
    <figure className="relative mx-auto w-full max-w-[710px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-[19%] aspect-square rounded-full bg-amber-300/5 blur-3xl" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/5 bg-[radial-gradient(ellipse_at_50%_42%,rgba(249,177,82,0.10),rgba(8,14,32,0)_65%)]">
        <svg viewBox="0 0 600 640" preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${theme.label} festival parol with ${friendCount} friends, rendered as one optimized image`}
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{touchAction:'none', userSelect:'none'}}
          onPointerDown={pointerDown} onPointerMove={pointerMove}
          onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
          onClick={selectLight}>
          <g transform={transform} style={{
            transition: pointers.current.size === 0 ? 'transform 420ms ease-out' : 'none',
          }}>
            {visibleImage && <image href={visibleImage.url} width="600" height="640"
              preserveAspectRatio="xMidYMid meet" />}
            {activeWave && <image href={activeWave.next.url} width="600" height="640"
              preserveAspectRatio="xMidYMid meet" pointerEvents="none"
              className="parol-snapshot-wave-reveal"
              style={{clipPath: `circle(${SNAPSHOT_WAVE_RADIUS[activeWave.wave]}% at 50% 47.2%)`}} />}
            {activeWave && <circle key={activeWave.wave} cx="300" cy="302"
              r={activeWave.wave === 1 ? 135 : activeWave.wave === 2 ? 240 : 295}
              stroke="#ffe9a0" strokeWidth="7" fill="none" pointerEvents="none"
              className="parol-snapshot-wave-glint" aria-hidden="true" />}
            {selectedPoint && <circle
              cx={CENTER_X + (selectedPoint.x - CENTER_X) * fit}
              cy={CENTER_Y + (selectedPoint.y - CENTER_Y) * fit}
              r="12" fill="none" stroke="#fff3a3" strokeWidth="2.5"
              aria-hidden="true" />}
          </g>
        </svg>
        {!visibleImage && !error && <div role="status"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-amber-100/80">
          Preparing your parol image…
        </div>}
        {loading && visibleImage && <div role="status" className="absolute left-3 top-3 rounded-full bg-[#101b33]/90 px-3 py-2 text-xs text-amber-100">
          Updating parol image…
        </div>}
        {error && <div role="alert"
          className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300/30 bg-[#101b33]/95 p-3 text-xs text-rose-100">
          <span>{error}{visibleImage ? ' Showing the previous image.' : ''}</span>
          <button type="button" className="rounded-lg border border-rose-200/40 px-3 py-2 font-semibold"
            onClick={() => setAttempt(n => n + 1)}>Retry</button>
        </div>}
        {activeWave && <div role="status" aria-live="polite"
          className="pointer-events-none absolute left-3 top-3 rounded-full border border-amber-300/30 bg-[#101b33]/90 px-3 py-2 text-xs font-semibold text-amber-100">
          ✦ {SNAPSHOT_WAVE_LABEL[activeWave.wave]}
        </div>}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/15 bg-[#101b33]/90 p-1.5 text-sm shadow-xl backdrop-blur">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white hover:bg-white/15 disabled:opacity-30"
            aria-label="Zoom out" disabled={camera.zoom <= MIN_ZOOM}
            onClick={() => setCamera(old => ({...old, zoom: clamp(old.zoom - .2, MIN_ZOOM, MAX_ZOOM)}))}>−</button>
          <button type="button" className="min-w-16 rounded-full px-2 py-3 text-xs font-semibold text-amber-100 hover:bg-white/15"
            aria-label="Fit the whole lantern" onClick={() => setCamera({zoom:1,x:0,y:0})}>Fit</button>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white hover:bg-white/15 disabled:opacity-30"
            aria-label="Zoom in" disabled={camera.zoom >= MAX_ZOOM}
            onClick={() => setCamera(old => ({...old, zoom: clamp(old.zoom + .2, MIN_ZOOM, MAX_ZOOM)}))}>+</button>
          {contributions.length > 0 && <button type="button"
            className="rounded-full px-3 py-3 text-xs font-semibold text-amber-100 hover:bg-white/15"
            onClick={selectNextLight} aria-label="Highlight next friend's light">Lights</button>}
        </div>
        <div className="pointer-events-none absolute left-3 bottom-3 rounded-full border border-white/10 bg-[#101b33]/80 px-3 py-2 text-[11px] text-amber-100/80">
          {friendCount} friends · {growthForFriends(friendCount)} growth layers
        </div>
      </div>
      {selected && <figcaption className="mt-2 text-center text-xs text-amber-200">
        Selected: {selected.displayName} · Light #{selected.slotIndex + 1}
      </figcaption>}
      <figcaption role="status" aria-live="polite" className="mt-2 text-center text-xs text-white/50">
        {activeWave ? SNAPSHOT_WAVE_LABEL[activeWave.wave] :
          loading ? 'Loading the completed parol snapshot…' :
          ready ? 'Saved parol image · Drag, pinch or Fit to explore' :
          'A newer parol image is not yet available · Retry to refresh'}
      </figcaption>
    </figure>
  )
}

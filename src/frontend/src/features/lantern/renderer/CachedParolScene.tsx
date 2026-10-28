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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [camera, setCamera] = useState<Camera>({ zoom: 1, x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef<Map<number, Point>>(new Map())
  const dragged = useRef(false)

  // Object URLs are local to this session, never persisted or exposed as
  // public media URLs. Revoke after replacement/unmount to avoid memory leaks.
  useEffect(() => {
    const url = rendered?.url
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [rendered?.url])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError('')
    setSelectedId(null)

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
          setRendered({ key: stateKey, url })
          setCamera({ zoom: 1, x: 0, y: 0 })
          setLoading(false)
          setError('')
          return
        } catch (caught) {
          if (!active || controller.signal.aborted) return
          if (caught instanceof ApiError && caught.status === 503 && tries < 2) {
            await new Promise(resolve => setTimeout(resolve, (tries + 1) * 2000))
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
  // stateKey is a canonical representation of the image request state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, attempt])

  const current = rendered?.key === stateKey
  const fit = outerFitZoom(growthForFriends(friendCount))
  const selected = contributions.find(light => light.id === selectedId)
  const selectedPoint = selected && current ? lightPosition(selected.slotIndex) : null
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
    if (dragged.current || !current || !contributions.length) return
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
            {rendered && <image href={rendered.url} width="600" height="640"
              preserveAspectRatio="xMidYMid meet" />}
            {selectedPoint && <circle
              cx={CENTER_X + (selectedPoint.x - CENTER_X) * fit}
              cy={CENTER_Y + (selectedPoint.y - CENTER_Y) * fit}
              r="12" fill="none" stroke="#fff3a3" strokeWidth="2.5"
              aria-hidden="true" />}
          </g>
        </svg>
        {!rendered && !error && <div role="status"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-amber-100/80">
          Preparing your parol image…
        </div>}
        {loading && rendered && <div role="status" className="absolute left-3 top-3 rounded-full bg-[#101b33]/90 px-3 py-2 text-xs text-amber-100">
          Updating parol image…
        </div>}
        {error && <div role="alert"
          className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300/30 bg-[#101b33]/95 p-3 text-xs text-rose-100">
          <span>{error}{rendered ? ' Showing the previous image.' : ''}</span>
          <button type="button" className="rounded-lg border border-rose-200/40 px-3 py-2 font-semibold"
            onClick={() => setAttempt(n => n + 1)}>Retry</button>
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
        {loading ? 'Loading the completed parol snapshot…' :
          current ? 'Saved parol image · Drag, pinch or Fit to explore' :
          'A newer parol image is not yet available · Retry to refresh'}
      </figcaption>
    </figure>
  )
}

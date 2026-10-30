import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { nextGrowthStep, retargetGrowth, settledGrowth, STEP_DURATIONS_MS,
  visibleGrowth, visibleFriends } from '../growth/reveal'
import type { Theme } from '../../customization/themes'
import { MAX_TEST_FRIENDS } from '../growth/stages'
import { outerFitZoom } from '../growth/outerGrowth'
import ParolArtwork from './ParolArtwork'
import ProceduralOuterShell from './ProceduralOuterShell'
import { lightPosition } from './lightPositions'

export type LanternLight = { id: string; slotIndex: number; displayName: string }

type Props = {
  theme: Theme
  pattern?: string
  contributions?: readonly LanternLight[]
  /** Isolated demo count, never saved or sent to the API. */
  previewCount?: number
}

type Camera = { zoom: number; x: number; y: number }
type Finger = { x: number; y: number }
const MIN_ZOOM = 0.04
const MAX_ZOOM = 4
const VIEW_WIDTH = 600
const VIEW_HEIGHT = 640
const CENTER_X = 300
const CENTER_Y = 302

function limit(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function scaledDistance(a: Finger, b: Finger): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export default function LanternScene({
  theme, pattern = 'default', contributions = [], previewCount,
}: Props) {
  const isPreview = previewCount !== undefined
  const previewAmount = previewCount === undefined ? 0 :
    (Number.isSafeInteger(previewCount) ? limit(previewCount, 0, MAX_TEST_FRIENDS) : 0)
  const preview = Array.from({ length: previewAmount }, (_, index): LanternLight => ({
    id: `preview-${index}`,
    slotIndex: index,
    displayName: `Sample light ${index + 1}`,
  }))
  const lights = isPreview ? preview : contributions
  const friendCount = lights.length
  const [reveal, setReveal] = useState(() => settledGrowth(friendCount))
  const priorFriendCount = useRef(friendCount)
  const priorPreview = useRef(isPreview)
  const returnedToTab = useRef(0)
  const growthCount = visibleGrowth(reveal)
  const drawnFriends = visibleFriends(reveal)
  const drawnLights = lights.slice(0, drawnFriends)
  const fitZoom = outerFitZoom(growthCount)
  const [camera, setCamera] = useState<Camera>(() => ({ zoom: fitZoom, x: 0, y: 0 }))
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const pointers = useRef<Map<number, Finger>>(new Map())

  // A fresh page shows the saved lantern complete. Only new, live arrivals
  // animate; jumps to milestones and returning after an absence are instant.
  useEffect(() => {
    const whenVisible = () => { if (!document.hidden) returnedToTab.current = Date.now() }
    document.addEventListener('visibilitychange', whenVisible)
    return () => document.removeEventListener('visibilitychange', whenVisible)
  }, [])

  useEffect(() => {
    const changedMode = priorPreview.current !== isPreview
    const increasedByOne = friendCount === priorFriendCount.current + 1
    const skipAnimation = (changedMode && !increasedByOne) || !increasedByOne ||
      document.hidden || (returnedToTab.current > 0 && Date.now() - returnedToTab.current < 6000) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    priorFriendCount.current = friendCount
    priorPreview.current = isPreview
    setReveal(current => retargetGrowth(current, friendCount, skipAnimation))
  }, [friendCount, isPreview])

  useEffect(() => {
    if (reveal.step === 0) return
    const timer = window.setTimeout(() => setReveal(current => nextGrowthStep(current)),
      STEP_DURATIONS_MS[reveal.step - 1])
    return () => window.clearTimeout(timer)
  }, [reveal])

  // When a growth layer arrives, automatically reframe the evolving
  // silhouette. User pinch/zoom remains available until the next update.
  useEffect(() => {
    setCamera({ zoom: fitZoom, x: 0, y: 0 })
  }, [fitZoom])

  useEffect(() => {
    setSelectedFriendId(null)
  }, [isPreview, friendCount])

  const selected = drawnLights.find(light => light.id === selectedFriendId)
  const transform = `translate(${CENTER_X + camera.x} ${CENTER_Y + camera.y}) scale(${camera.zoom}) translate(${-CENTER_X} ${-CENTER_Y})`

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const tracked = pointers.current
    const oldPoint = tracked.get(event.pointerId)
    if (!oldPoint) return
    const before = Array.from(tracked.values())
    tracked.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const after = Array.from(tracked.values())
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const ratioX = VIEW_WIDTH / bounds.width
    const ratioY = VIEW_HEIGHT / bounds.height

    if (before.length >= 2 && after.length >= 2) {
      const oldDistance = scaledDistance(before[0], before[1])
      const newDistance = scaledDistance(after[0], after[1])
      const oldMidX = (before[0].x + before[1].x) / 2
      const oldMidY = (before[0].y + before[1].y) / 2
      const newMidX = (after[0].x + after[1].x) / 2
      const newMidY = (after[0].y + after[1].y) / 2
      setCamera(old => ({
        zoom: limit(old.zoom * (oldDistance > 0 ? newDistance / oldDistance : 1), MIN_ZOOM, MAX_ZOOM),
        x: limit(old.x + (newMidX - oldMidX) * ratioX, -300, 300),
        y: limit(old.y + (newMidY - oldMidY) * ratioY, -320, 320),
      }))
    } else if (after.length === 1) {
      setCamera(old => ({
        ...old,
        x: limit(old.x + (event.clientX - oldPoint.x) * ratioX, -300, 300),
        y: limit(old.y + (event.clientY - oldPoint.y) * ratioY, -320, 320),
      }))
    }
  }

  function pointerEnd(event: PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function zoomBy(delta: number) {
    setCamera(old => ({
      ...old, zoom: limit(Number((old.zoom + delta).toFixed(3)), MIN_ZOOM, MAX_ZOOM),
    }))
  }

  return (
    <figure className="relative mx-auto w-full max-w-[710px]">
      <div className="pointer-events-none absolute inset-x-[14%] top-[19%] aspect-square rounded-full bg-amber-300/5 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/5 bg-[radial-gradient(ellipse_at_50%_42%,rgba(249,177,82,0.10),rgba(8,14,32,0)_65%)]">
        <svg
          role="img"
          aria-label={`${theme.label} parol with ${friendCount} friends`}
          viewBox="0 0 600 640"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
        >
          <g transform={transform} style={{
            transition: pointers.current.size === 0 ? 'transform 420ms ease-out' : 'none',
          }}>
            <ProceduralOuterShell theme={theme} growthCount={growthCount} animateGrowth={reveal.step !== 0} pattern={pattern} />
            <ParolArtwork theme={theme} pattern={pattern} />
            <g className="parol-contributions">
              {drawnLights.map(light => {
                const { x, y, radius } = lightPosition(light.slotIndex)
                const lightColor = theme.colors[light.slotIndex % theme.colors.length]
                const focused = light.id === selectedFriendId
                return (
                  <g key={light.id} className="parol-light" tabIndex={0}
                    role="button" aria-label={`Highlight ${light.displayName}`}
                    onClick={() => setSelectedFriendId(focused ? null : light.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedFriendId(focused ? null : light.id)
                      }
                    }}
                    style={{ cursor: 'pointer' }}>
                    <title>{light.displayName}</title>
                    <circle cx={x} cy={y} r={radius * (focused ? 4 : 2.8)}
                      fill={lightColor} opacity={focused ? '.56' : '.27'} />
                    <circle cx={x} cy={y} r={radius * 1.7} fill={lightColor} opacity=".48" />
                    <circle cx={x} cy={y} r={radius} fill={focused ? '#fff9d5' : lightColor}
                      stroke="#fff9e6" strokeWidth={focused ? 1.8 : .9} />
                    <circle cx={x - radius * .2} cy={y - radius * .2} r={radius * .32} fill="#fffef5" />
                  </g>
                )
              })}
            </g>
          </g>
        </svg>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/15 bg-[#101b33]/90 p-1.5 text-sm shadow-xl backdrop-blur">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white transition hover:bg-white/15 disabled:opacity-30" aria-label="Zoom out" title="Zoom out" disabled={camera.zoom <= MIN_ZOOM} onClick={() => zoomBy(-0.2)}>−</button>
          <button type="button" className="min-w-16 rounded-full px-2 py-3 text-xs font-semibold text-amber-100 transition hover:bg-white/15" aria-label="Fit the whole lantern" title="Fit lantern" onClick={() => setCamera({ zoom: fitZoom, x: 0, y: 0 })}>Fit</button>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white transition hover:bg-white/15 disabled:opacity-30" aria-label="Zoom in" title="Zoom in" disabled={camera.zoom >= MAX_ZOOM} onClick={() => zoomBy(0.2)}>+</button>
        </div>
      </div>
      {selected && <figcaption className="mt-2 text-center text-xs text-amber-200">
        {selected.displayName}
      </figcaption>
      <figcaption role="status" aria-live="polite" className="sr-only">
        {reveal.step > 0 ? 'Parol growing' : 'Parol ready'}
      </figcaption>
    </figure>
  )
}

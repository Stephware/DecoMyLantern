import { useRef, useState, type PointerEvent } from 'react'
import type { Theme } from '../../customization/themes'
import { DESIGN_TARGET_FRIENDS, stageForFriends } from '../growth/stages'
import ParolArtwork from './ParolArtwork'
import { lightPosition } from './lightPositions'

export type LanternLight = { id: string; slotIndex: number; displayName: string }

type Props = {
  theme: Theme
  pattern?: string
  contributions?: readonly LanternLight[]
  /** Only for unauthenticated previews; never substitutes for persisted guest data. */
  previewCount?: number
}

type Camera = { zoom: number; x: number; y: number }
type Finger = { x: number; y: number }
const MIN_ZOOM = 0.8
const MAX_ZOOM = 3
const VIEW_WIDTH = 600
const VIEW_HEIGHT = 640
const CENTER_X = 300
const CENTER_Y = 305

function limit(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function scaledDistance(a: Finger, b: Finger): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export default function LanternScene({ theme, pattern = 'default', contributions = [], previewCount }: Props) {
  const [camera, setCamera] = useState<Camera>({ zoom: 1, x: 0, y: 0 })
  const pointers = useRef<Map<number, Finger>>(new Map())
  const preview = Array.from({ length: limit(previewCount ?? 0, 0, DESIGN_TARGET_FRIENDS) }, (_, index): LanternLight => ({
    id: `preview-${index}`,
    slotIndex: index,
    displayName: `Preview light ${index + 1}`,
  }))
  const isPreview = previewCount !== undefined
  const lights = isPreview ? preview : contributions
  const stage = stageForFriends(lights.length)
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
    setCamera(old => ({ ...old, zoom: limit(Number((old.zoom + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM) }))
  }

  return (
    <figure className="relative mx-auto w-full max-w-[710px]">
      <div className="pointer-events-none absolute inset-x-[14%] top-[19%] aspect-square rounded-full bg-amber-300/5 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/5 bg-[radial-gradient(ellipse_at_50%_42%,rgba(249,177,82,0.10),rgba(8,14,32,0)_65%)]">
        <svg
          role="img"
          aria-label={`${theme.label} parol, ${stage.name}, ${lights.length} ${isPreview ? 'preview lights' : 'accepted contributor lights'}`}
          viewBox="0 0 600 640"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
        >
          <g transform={transform}>
            <ParolArtwork theme={theme} friendCount={lights.length} pattern={pattern} />
            <g className="parol-contributions">
              {lights.map(light => {
                const { x, y, radius } = lightPosition(light.slotIndex)
                const lightColor = theme.colors[light.slotIndex % theme.colors.length]
                return (
                  <g key={light.id} className="parol-light">
                    <title>{light.displayName}</title>
                    <circle cx={x} cy={y} r={radius * 2.8} fill={lightColor} opacity=".27" />
                    <circle cx={x} cy={y} r={radius * 1.7} fill={lightColor} opacity=".48" />
                    <circle cx={x} cy={y} r={radius} fill={lightColor} stroke="#fff9e6" strokeWidth=".9" />
                    <circle cx={x - radius * .2} cy={y - radius * .2} r={radius * .32} fill="#fffef5" />
                  </g>
                )
              })}
            </g>
          </g>
        </svg>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/15 bg-[#101b33]/90 p-1.5 text-sm shadow-xl backdrop-blur">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white transition hover:bg-white/15 disabled:opacity-30" aria-label="Zoom out" title="Zoom out" disabled={camera.zoom <= MIN_ZOOM} onClick={() => zoomBy(-0.25)}>−</button>
          <button type="button" className="min-w-16 rounded-full px-2 py-3 text-xs font-semibold text-amber-100 transition hover:bg-white/15" aria-label="Fit the whole lantern" title="Fit lantern" onClick={() => setCamera({ zoom: 1, x: 0, y: 0 })}>Fit</button>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white transition hover:bg-white/15 disabled:opacity-30" aria-label="Zoom in" title="Zoom in" disabled={camera.zoom >= MAX_ZOOM} onClick={() => zoomBy(0.25)}>+</button>
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-[#101b33]/80 px-3 py-2 text-[11px] text-amber-100/80 backdrop-blur">
          {stage.name} · {lights.length} {isPreview ? 'sample' : 'accepted'} lights
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-white/40">Drag to explore · Pinch on mobile to zoom · Fit to recenter</figcaption>
    </figure>
  )
}

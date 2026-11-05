import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {StoryFrame, type StoryData} from './StoryFrame'
import {STORY_PRESETS} from './storySpec'

const {width: STORY_WIDTH, height: STORY_HEIGHT} = STORY_PRESETS.high

/**
 * Original Remotion browser MP4 rendering and device-local Canvas PNG.
 * No device-rendered media is uploaded. Existing authorized server exports remain
 * the fallback for unsupported/low-memory devices, large parols, or failures.
 */

export function isPhoneStoryDevice(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 900px)').matches &&
    (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)
}

/** Device memory limits came from the feature/video-parsing-optimization
 * benchmarks (50 friends used ~2.3 GiB in Chrome). Unknown-memory phones
 * are conservatively capped at 6; well-provisioned devices may render more. */
export function deviceVideoFriendLimit(): number {
  if (typeof navigator === 'undefined') return 0
  const memory = (navigator as Navigator & {deviceMemory?: number}).deviceMemory
  if (memory === undefined) return 6
  return memory >= 4 ? 12 : 6
}

export async function canRenderStoryOnDevice(friendCount?: number, slotCount?: number): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if ((friendCount ?? 0) > deviceVideoFriendLimit() ||
      (slotCount ?? 0) > deviceVideoFriendLimit()) return false
  try {
    const {browserCanRenderStory} = await import('./browserRenderer')
    return await browserCanRenderStory()
  } catch {
    return false
  }
}

// Preserve the old entrypoint for code still importing the phone-specific API.
export const canRenderStoryOnPhone = canRenderStoryOnDevice

function abortIfNeeded(signal: AbortSignal): void {
  if (signal.aborted || document.hidden)
    throw new DOMException('Phone video generation stopped.', 'AbortError')
}

/** Serialize the SAME deterministic StoryFrame used by Remotion into an
 * inline, self-contained SVG foreignObject. Browser support is deliberately
 * checked; any unsupported rasterization returns control to the server queue.
 */
function frameSvg(data: StoryData, frame: number): string {
  // An SVG nested inside XHTML foreignObject needs its own XML namespace.
  const markup = renderToStaticMarkup(createElement(StoryFrame, {data, frame, preset: 'high'}))
    .replace(/<svg(?=\s|>)/g, '<svg xmlns="http://www.w3.org/2000/svg"')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STORY_WIDTH}" height="${STORY_HEIGHT}" viewBox="0 0 ${STORY_WIDTH} ${STORY_HEIGHT}"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${markup}</div></foreignObject></svg>`
}

async function paintFrame(canvas: HTMLCanvasElement, data: StoryData, frame: number,
                          signal: AbortSignal): Promise<void> {
  abortIfNeeded(signal)
  const blobUrl = URL.createObjectURL(new Blob([frameSvg(data, frame)], {type:'image/svg+xml'}))
  try {
    const image = new Image()
    image.src = blobUrl
    // A few WebKit/browser builds never settle decode() for foreignObject
    // images. Bound each decode so the existing queue can take over.
    let decodeTimeout: number | undefined
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => {
          decodeTimeout = window.setTimeout(
            () => reject(new Error('Phone Story frame decoding timed out.')), 8_000)
        }),
      ])
    } finally {
      if (decodeTimeout !== undefined) window.clearTimeout(decodeTimeout)
    }
    abortIfNeeded(signal)
    const context = canvas.getContext('2d', {alpha:false})
    if (!context) throw new Error('Canvas drawing is unavailable.')
    context.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT)
    context.drawImage(image, 0, 0, STORY_WIDTH, STORY_HEIGHT)
    // This readback also rejects tainted foreignObject rendering. Empty or
    // unsupported captures must never be exported as apparently valid MP4s.
    if (frame === 0) {
      const pixel = context.getImageData(STORY_WIDTH / 2, STORY_HEIGHT / 2, 1, 1).data
      if (pixel[3] === 0 || (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0))
        throw new Error('This browser cannot capture the Story artwork.')
    }
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

/** Reject browsers that decode foreignObject SVG but discard its changing
 * contents. A successfully decoded image is not by itself proof of a real Story.
 */
async function verifyFramePainting(canvas: HTMLCanvasElement, data: StoryData,
                                   signal: AbortSignal): Promise<void> {
  const context = canvas.getContext('2d', {alpha:false})
  if (!context) throw new Error('Canvas drawing is unavailable.')
  const points = [
    [540, 470], [430, 600], [650, 700], [540, 770],
    [370, 900], [700, 900], [540, 1080], [540, 1160],
  ] as const
  await paintFrame(canvas, data, 0, signal)
  const before = points.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data))
  await paintFrame(canvas, data, 200, signal)
  const changed = points.some(([x, y], index) => {
    const after = context.getImageData(x, y, 1, 1).data
    return [0, 1, 2].some(channel => Math.abs(after[channel] - before[index][channel]) > 8)
  })
  if (!changed) throw new Error('This browser cannot capture the animated Story accurately.')
}

/** Keep the existing device API while using the original optimized renderer. */
export async function renderStoryOnDevice(
  data: StoryData, signal: AbortSignal, onProgress: (percent: number) => void,
): Promise<Blob> {
  abortIfNeeded(signal)
  const {renderStoryInBrowser} = await import('./browserRenderer')
  return renderStoryInBrowser(data, signal, (_phase, fraction) => {
    onProgress(Math.round(fraction * 100))
  })
}

/** A local PNG uses the exact completed frame 200 of the same StoryFrame.
 * If foreignObject drawing/Canvas is blocked, the caller uses the authorized
 * legacy PNG endpoint instead. This method never fetches image media remotely. */
export async function renderStoryImageOnDevice(
  data: StoryData, signal: AbortSignal,
): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Canvas is unavailable.')
  abortIfNeeded(signal)
  const canvas = document.createElement('canvas')
  canvas.width = STORY_WIDTH
  canvas.height = STORY_HEIGHT
  try {
    // Two sufficiently different frames are required to prove the browser
    // actually painted our parol, not merely the background or a blank SVG.
    await verifyFramePainting(canvas, data, signal)
    abortIfNeeded(signal)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) :
        reject(new Error('This device cannot export a Story PNG.')), 'image/png')
    })
    abortIfNeeded(signal)
    if (blob.type !== 'image/png' || blob.size < 1024)
      throw new Error('Device PNG export was incomplete.')
    const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
    if ([137,80,78,71,13,10,26,10].some((byte, i) => byte !== signature[i]))
      throw new Error('Device image is not a valid PNG.')
    return blob
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

// Compatibility with existing phone-only users.
export const renderStoryOnPhone = renderStoryOnDevice

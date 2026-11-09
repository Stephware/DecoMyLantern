import {access} from 'node:fs/promises'
import {constants} from 'node:fs'

// A file/permission probe only: no Chromium launch, video render, writes, or
// large file reads on a health request. Real rendering is covered in CI.
export function createRendererReadiness({
  bundlePath, renderDir, imageDir, ffmpegPath = '/usr/bin/ffmpeg',
  mode = 'remotion', optimizedAssetsReady = false, backgroundPath = null,
  checkAccess = access, now = () => Date.now(), cacheMs = 5000,
}) {
  if (!bundlePath || !renderDir || !imageDir) throw new Error('Missing readiness paths')
  const ffprobePath = ffmpegPath.replace(/ffmpeg$/, 'ffprobe')
  let cached = null
  let expires = 0
  let running = null

  async function available(file, permission) {
    try { await checkAccess(file, permission); return true }
    catch { return false }
  }

  async function sample() {
    const [bundle, renderFiles, imageFiles, ffmpeg, ffprobe, optimizedBackground] =
      await Promise.all([
        available(bundlePath, constants.R_OK),
        available(renderDir, constants.W_OK),
        available(imageDir, constants.W_OK),
        available(ffmpegPath, constants.X_OK),
        available(ffprobePath, constants.X_OK),
        backgroundPath ? available(backgroundPath, constants.R_OK) : Promise.resolve(false),
      ])
    const storage = renderFiles && imageFiles
    const mediaTools = ffmpeg && ffprobe
    const requiredReady = bundle && storage && mediaTools
    const optimization = mode === 'ffmpeg'
      ? (optimizedAssetsReady && optimizedBackground ? 'ready' : 'fallback')
      : 'not_selected'
    const status = !requiredReady ? 'unavailable'
      : optimization === 'fallback' ? 'degraded' : 'ready'
    return {
      status,
      components: {
        bundle: bundle ? 'ready' : 'unavailable',
        outputStorage: storage ? 'ready' : 'unavailable',
        mediaTools: mediaTools ? 'ready' : 'unavailable',
        optimizedVideo: optimization,
      },
    }
  }

  return async function readiness() {
    if (cached && now() < expires) return cached
    if (running) return running
    running = sample().then(result => {
      cached = result
      expires = now() + Math.max(0, cacheMs)
      return result
    }).finally(() => { running = null })
    return running
  }
}

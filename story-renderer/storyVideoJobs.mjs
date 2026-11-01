import crypto from 'node:crypto'
import path from 'node:path'
import {stat, rename, unlink} from 'node:fs/promises'

// The job identity is derived only from the server-verified saved parol.
// Never accept an arbitrary public file path or an owner recovery key.
export function storyVideoDigest({kind, designKey, patternKey, friendCount, slots, highlightSlot}) {
  const canonical = {kind, designKey, patternKey, friendCount, slots, highlightSlot, format:'mp4'}
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

/**
 * Bounded one-at-a-time background queue in the private Remotion renderer.
 * A browser disconnect does not cancel an accepted job. Ready files are
 * reusable for 24h, including after reopening a page on the same renderer.
 * Pending work is in-memory: a service restart requires re-queuing it.
 */
export function createStoryVideoJobs({
  renderDir, renderVideo, isBusy, setBusy, cleanup = async () => {},
  ttlMs = 24 * 60 * 60 * 1000, maxQueued = 12,
}) {
  const jobs = new Map()
  const queue = []
  let retryTimer = null

  function filename(payload) {
    return path.join(renderDir, storyVideoDigest(payload) + '.mp4')
  }

  async function completed(payload) {
    const name = filename(payload)
    const info = await stat(name).catch(() => null)
    return info?.isFile() && info.size > 1024 && Date.now() - info.mtimeMs < ttlMs
  }

  function schedule() {
    if (retryTimer !== null || queue.length === 0) return
    if (isBusy()) {
      retryTimer = setTimeout(() => {
        retryTimer = null
        schedule()
      }, 300)
      retryTimer.unref?.()
      return
    }
    const job = queue.shift()
    if (!job || job.status !== 'queued') { schedule(); return }
    setBusy(true)
    job.status = 'rendering'
    // Intentionally detached from the HTTP response; run to completion even
    // when the browser disconnects, with an atomic final MP4 rename.
    void (async () => {
      const finalPath = filename(job.payload)
      const partial = finalPath + '.' + crypto.randomUUID() + '.partial.mp4'
      try {
        await renderVideo(job.payload, partial)
        const info = await stat(partial)
        if (info.size <= 1024) throw new Error('Story video output is incomplete')
        await rename(partial, finalPath)
        job.status = 'ready'
        void cleanup().catch(() => {})
      } catch (error) {
        console.error('Background Story render failed:', error)
        job.status = 'failed'
      } finally {
        await unlink(partial).catch(() => {})
        setBusy(false)
        schedule()
      }
    })()
  }

  async function status(payload) {
    const id = storyVideoDigest(payload)
    if (await completed(payload)) return {status:'ready', id}
    const job = jobs.get(id)
    return {status: job?.status ?? 'not_found', id}
  }

  async function start(payload) {
    const found = await status(payload)
    if (found.status === 'ready' || found.status === 'queued' || found.status === 'rendering')
      return found
    if (queue.length >= maxQueued) return {status:'busy', id:found.id}
    const job = {payload, status:'queued'}
    jobs.set(found.id, job)
    queue.push(job)
    schedule()
    return {status:job.status, id:found.id}
  }

  return {start, status, filename, completed}
}

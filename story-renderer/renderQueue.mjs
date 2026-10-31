import crypto from 'node:crypto'

const TERMINAL = new Set(['completed','failed','cancelled'])

/** One encoder, bounded pending work, and independent handles for duplicate callers. */
export class RenderQueue {
  constructor({maxPending = 3, maxActive = 1, retentionMs = 60 * 60 * 1000} = {}) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 0 || maxPending > 32)
      throw new RangeError('Invalid pending render limit')
    this.maxPending = maxPending
    this.maxActive = maxActive
    this.retentionMs = retentionMs
    this.pending = []
    this.byKey = new Map()
    this.handles = new Map()
    this.cancelled = new Map()
    this.active = 0
  }

  submit(key, file, run, {cached = false} = {}) {
    this.prune()
    let work = this.byKey.get(key)
    if (!work) {
      if (!cached && this.active >= this.maxActive && this.pending.length >= this.maxPending)
        return null
      work = {key,file,run,status:cached?'completed':'queued',progress:cached?1:0,
        error:null,controller:new AbortController(),subscribers:new Set(),updated:Date.now()}
      if (!cached) { this.byKey.set(key,work); this.pending.push(work) }
    }
    const id = crypto.randomUUID()
    work.subscribers.add(id)
    this.handles.set(id,work)
    if (!cached) this.pump()
    return this.describe(id)
  }

  describe(id) {
    const work = this.handles.get(id)
    if (!work) return null
    if (this.cancelled.has(id)) return {id,status:'cancelled',progress:work.progress,position:0,error:null}
    return {id,status:work.status,progress:work.progress,
      position:work.status==='queued' ? this.pending.indexOf(work)+1 : 0,
      error:work.error}
  }

  file(id) {
    if (this.cancelled.has(id)) return null
    const work = this.handles.get(id)
    return work?.status === 'completed' ? work.file : null
  }

  cancel(id) {
    const work = this.handles.get(id)
    if (!work) return false
    if (this.cancelled.has(id)) return true
    this.cancelled.set(id,Date.now())
    work.subscribers.delete(id)
    if (work.subscribers.size === 0 && !TERMINAL.has(work.status)) {
      work.controller.abort()
      if (work.status === 'queued') {
        this.pending.splice(this.pending.indexOf(work),1)
        work.status = 'cancelled'
        work.updated = Date.now()
        this.byKey.delete(work.key)
      }
    }
    return true
  }

  prune(now = Date.now()) {
    for (const [id,work] of this.handles)
      if ((this.cancelled.has(id) && now-this.cancelled.get(id) > this.retentionMs) ||
          (TERMINAL.has(work.status) && now-work.updated > this.retentionMs)) {
        this.handles.delete(id)
        work.subscribers.delete(id)
        this.cancelled.delete(id)
      }
  }

  pump() {
    while (this.active < this.maxActive && this.pending.length) {
      const work = this.pending.shift()
      if (work.controller.signal.aborted) continue
      this.active++
      work.status = 'rendering'
      work.updated = Date.now()
      Promise.resolve().then(() => work.run(work.controller.signal, value => {
        work.progress = Math.max(work.progress,Math.min(.99,Number(value)||0))
        work.updated = Date.now()
      })).then(() => {
        work.status = work.controller.signal.aborted ? 'cancelled' : 'completed'
        work.progress = work.status === 'completed' ? 1 : work.progress
      },error => {
        work.status = work.controller.signal.aborted ? 'cancelled' : 'failed'
        work.error = work.status === 'failed' ? (error?.code || 'RENDER_FAILED') : null
      }).finally(() => {
        work.updated = Date.now()
        this.byKey.delete(work.key)
        this.active--
        this.pump()
      })
    }
  }
}

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {prepareMediaWithRetry, retryableMediaError, waitBeforeMediaRetry} from '../src/features/story/mediaExportTask.ts'

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
const failure = status => Object.assign(new Error('Media service unavailable'), {status})

test('transient 503 or 504 errors retry no more than twice', async () => {
  const controller = new AbortController()
  const attempts = []
  const notice = []
  const blob = await prepareMediaWithRetry(async () => {
    attempts.push(1)
    if (attempts.length <= 2) throw failure(attempts.length === 1 ? 503 : 504)
    return new Blob(['ok'])
  }, controller.signal, retryNumber => notice.push(retryNumber), 0)
  assert.equal(blob.size, 2)
  assert.equal(attempts.length, 3)
  assert.deepEqual(notice, [1, 2])

  let failedCount = 0
  await assert.rejects(
    prepareMediaWithRetry(async () => {
      failedCount++
      throw failure(503)
    }, controller.signal, () => {}, 0),
    /Media service unavailable/
  )
  assert.equal(failedCount, 3)
})

test('authorization and rate limit failures never auto retry', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let count = 0
    await assert.rejects(prepareMediaWithRetry(async () => {
      count++
      throw failure(status)
    }, new AbortController().signal, () => {}, 0))
    assert.equal(count, 1, `status ${status}`)
    assert.equal(retryableMediaError(failure(status), 0), false)
  }
  assert.equal(retryableMediaError(failure(503), 2), false)
})

test('abort while waiting for retry resolves promptly without a further request', async () => {
  const controller = new AbortController()
  let calls = 0
  await assert.rejects(prepareMediaWithRetry(async () => {
    calls++
    throw failure(503)
  }, controller.signal, () => controller.abort(), 3000), error => error.name === 'AbortError')
  assert.equal(calls, 1)
})

test('an already aborted signal never begins media generation', async () => {
  const controller = new AbortController()
  controller.abort()
  let called = false
  await assert.rejects(prepareMediaWithRetry(async () => {
    called = true
    return new Blob([])
  }, controller.signal), error => error.name === 'AbortError')
  assert.equal(called, false)
  await assert.rejects(waitBeforeMediaRetry(1000, controller.signal), error => error.name === 'AbortError')
})

test('an abort after a response is discarded rather than exposed', async () => {
  const controller = new AbortController()
  await assert.rejects(prepareMediaWithRetry(async () => {
    controller.abort()
    return new Blob(['stale'])
  }, controller.signal), error => error.name === 'AbortError')
})

test('sharing uses an in-flight guard, session reuse, invalidation and cancellable APIs', () => {
  const story = read('features/story/StoryShare.tsx')
  const api = read('lib/api.ts')
  assert.ok(story.includes('if (activeRequest.current) return'))
  assert.ok(story.includes("pngKey === dataKey && png"))
  assert.ok(story.includes("videoKey === dataKey && video"))
  assert.ok(story.includes('activeRequest.current !== request'))
  assert.ok(story.includes('latestDataKey.current !== requestedKey'))
  assert.ok(story.includes('current.controller.abort()'))
  assert.ok(story.includes('Cancel preparation'))
  assert.ok(story.includes("error ? 'Try again'"))
  assert.ok(story.includes('role="alert"'))
  assert.ok(story.includes('role="status"'))
  assert.ok(story.includes('retrying > 0'))
  assert.ok(story.includes('prepareMediaWithRetry('))
  assert.ok(story.includes('URL.revokeObjectURL(url)'))
  assert.ok(api.includes("exportStoryMedia(kind: 'owner' | 'friend', format: 'mp4' | 'png', token?: string, signal?: AbortSignal)"))
  assert.ok(api.includes("exportParolImage(kind: 'owner' | 'friend', token?: string, signal?: AbortSignal)"))
  assert.ok(api.includes("csrfToken(guest ? '/api/invitations/csrf' : '/api/owner/csrf', signal)"))
  assert.ok(api.includes("token, signal, 'png'"))
})

test('no new queue, server endpoints, media storage or visual geometry added', () => {
  const story = read('features/story/StoryShare.tsx')
  const api = read('lib/api.ts')
  const policy = read('features/story/mediaExportTask.ts')
  assert.ok(!story.includes('localStorage'))
  assert.ok(!story.includes('sessionStorage'))
  assert.ok(!policy.includes('/api/'))
  assert.ok(!story.includes('ProceduralOuterShell'))
  assert.ok(!story.includes('indexedDB'))
  assert.ok(!api.includes('/api/media/jobs'))
})

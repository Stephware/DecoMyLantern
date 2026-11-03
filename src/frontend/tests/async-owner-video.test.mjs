import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {startOwnerVideoJob, getOwnerVideoJobStatus, getOwnerVideoJobFile} from '../src/lib/api.ts'

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')

test('MP4 job starts with owner cookie and CSRF, without a public file ID', async () => {
  const requests = []
  const original = globalThis.fetch
  globalThis.fetch = async (path, options = {}) => {
    requests.push({path, options})
    if (path === '/api/owner/csrf')
      return new Response(JSON.stringify({token:'csrf-job'}), {headers:{'content-type':'application/json'}})
    return new Response(JSON.stringify({status:'queued'}), {headers:{'content-type':'application/json'}})
  }
  try {
    assert.deepEqual(await startOwnerVideoJob(), {status:'queued'})
    assert.equal(requests.length, 2)
    const request = requests[1]
    assert.equal(request.path, '/api/my/lantern/story/video/job')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.credentials, 'same-origin')
    assert.equal(request.options.headers.get('X-CSRF-TOKEN'), 'csrf-job')
    assert.equal(request.options.body, undefined)
  } finally {globalThis.fetch = original}
})

test('status and finished MP4 require owner cookie, and no arbitrary job identifiers', async () => {
  const original = globalThis.fetch
  const paths = []
  globalThis.fetch = async (path, options={}) => {
    paths.push({path, options})
    if (String(path).endsWith('/file'))
      return new Response(new Uint8Array([1,2,3]), {headers:{'content-type':'video/mp4'}})
    return new Response(JSON.stringify({status:'ready'}), {headers:{'content-type':'application/json'}})
  }
  try {
    assert.deepEqual(await getOwnerVideoJobStatus(), {status:'ready'})
    const blob = await getOwnerVideoJobFile()
    assert.equal(blob.type, 'video/mp4')
    assert.equal(blob.size, 3)
    assert.deepEqual(paths.map(x=>x.path),
      ['/api/my/lantern/story/video/job', '/api/my/lantern/story/video/job/file'])
    assert.ok(paths.every(x=>x.options.credentials === 'same-origin'))
    assert.ok(paths.every(x=>x.options.cache === 'no-store'))
    assert.ok(paths.every(x=>!String(x.path).includes('token=')))
  } finally {globalThis.fetch = original}
})

test('returning owner sees queued/running/ready state and uses cached completed video', () => {
  const story = read('features/story/StoryShare.tsx')
  assert.ok(story.includes('getOwnerVideoJobStatus(controller.signal)'))
  assert.ok(story.includes('getOwnerVideoJobFile(controller.signal)'))
  assert.ok(story.includes('window.setTimeout(() => void check(), 3000)'))
  assert.ok(story.includes('startOwnerVideoJob(controller.signal)'))
  assert.ok(story.includes('You can close this page and return to Share your parol'))
  assert.ok(story.includes('setVideoKey(dataKey)'))
  assert.ok(story.includes("if (!open || format !== 'mp4' || data.kind !== 'owner'"))
  assert.ok(story.includes('controller.abort()'))
})

test('Story PNG, friend video endpoint and owner background queue remain distinct', () => {
  const story = read('features/story/StoryShare.tsx')
  const guest = read('features/invitations/GuestInvitationPage.tsx')
  assert.ok(story.includes("exportStoryMedia(data.kind, 'png', token, controller.signal)"))
  assert.ok(story.includes("exportStoryMedia(data.kind, 'mp4', token, controller.signal)"))
  assert.ok(story.includes("selected === 'mp4' && data.kind === 'owner'"))
  assert.ok(!guest.includes('<StoryShare'))
  assert.ok(story.includes('Share image'))
  assert.ok(story.includes('Download MP4'))
  assert.ok(story.includes('Copy invitation link'))
})

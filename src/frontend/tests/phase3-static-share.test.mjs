import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ApiError, exportParolImage, exportStoryMedia, fetchParolSnapshot} from '../src/lib/api.ts'

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')

test('API error keeps HTTP status in Node strip-only mode', () => {
  const error = new ApiError(503, 'Renderer temporarily busy')
  assert.equal(error.status, 503)
  assert.equal(error.name, 'ApiError')
  assert.match(error.message, /Renderer temporarily busy/)
})

function stubImageServer(mime = 'image/png') {
  const requests = []
  const previous = globalThis.fetch
  globalThis.fetch = async (path, options = {}) => {
    requests.push({path, options})
    if (String(path).endsWith('/csrf')) {
      return new Response(JSON.stringify({token: 'csrf-test'}), {
        headers: {'content-type': 'application/json'},
      })
    }
    return new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: {'content-type': mime},
    })
  }
  return {requests, restore: () => {globalThis.fetch = previous}}
}

test('separate parol-only snapshot endpoint remains available to authorized owners', async () => {
  const fake = stubImageServer()
  try {
    const blob = await exportParolImage('owner')
    assert.equal(blob.type, 'image/png')
    assert.equal(blob.size, 4)
    assert.equal(fake.requests[0].path, '/api/owner/csrf')
    const request = fake.requests[1]
    assert.equal(request.path, '/api/my/lantern/image')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.credentials, 'same-origin')
    assert.equal(request.options.cache, 'no-store')
    assert.equal(request.options.headers['X-CSRF-TOKEN'], 'csrf-test')
    assert.deepEqual(JSON.parse(request.options.body), {format: 'png'})
    assert.ok(!String(request.path).includes('token='))
  } finally { fake.restore() }
})

test('separate parol-only guest snapshot retains invitation authorization', async () => {
  const fake = stubImageServer()
  try {
    const token = 'abcdefghijklmnop'
    const blob = await exportParolImage('friend', token)
    assert.equal(blob.type, 'image/png')
    assert.equal(fake.requests[0].path, '/api/invitations/csrf')
    const request = fake.requests[1]
    assert.equal(request.path, '/api/invitations/image')
    assert.equal(request.options.method, 'POST')
    assert.deepEqual(JSON.parse(request.options.body), {token, format: 'png'})
    assert.ok(!String(request.path).includes(token))
  } finally { fake.restore() }
})

test('existing real-parol viewer still requests the default WebP format', async () => {
  const fake = stubImageServer('image/webp')
  try {
    const blob = await fetchParolSnapshot('owner')
    assert.equal(blob.type, 'image/webp')
    assert.deepEqual(JSON.parse(fake.requests[1].options.body), {format: 'webp'})
  } finally { fake.restore() }
})

test('missing invitation cannot export guest image', async () => {
  const fake = stubImageServer()
  try {
    await assert.rejects(exportParolImage('friend'), /Missing invitation token/)
    assert.equal(fake.requests.length, 0)
  } finally { fake.restore() }
})

test('incorrect response MIME does not expose a mislabeled PNG', async () => {
  const fake = stubImageServer('text/html')
  try {
    await assert.rejects(exportParolImage('owner'), /unexpected parol image format/)
  } finally { fake.restore() }
})

test('shareable still PNG uses the existing secured owner Story endpoint', async () => {
  const fake = stubImageServer()
  try {
    const blob = await exportStoryMedia('owner', 'png')
    assert.equal(blob.type, 'image/png')
    assert.equal(fake.requests[0].path, '/api/owner/csrf')
    const request = fake.requests[1]
    assert.equal(request.path, '/api/my/lantern/story')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.credentials, 'same-origin')
    assert.equal(request.options.cache, 'no-store')
    assert.equal(request.options.headers['X-CSRF-TOKEN'], 'csrf-test')
    assert.deepEqual(JSON.parse(request.options.body), {format:'png'})
  } finally {fake.restore()}
})

test('guest Story PNG uses existing contributor authorization and private POST body', async () => {
  const fake = stubImageServer()
  try {
    const token = 'abcdefghijklmnop'
    const blob = await exportStoryMedia('friend', 'png', token)
    assert.equal(blob.type, 'image/png')
    assert.equal(fake.requests[0].path, '/api/invitations/csrf')
    const request = fake.requests[1]
    assert.equal(request.path, '/api/invitations/story')
    assert.equal(request.options.credentials, 'same-origin')
    assert.deepEqual(JSON.parse(request.options.body), {format:'png', token})
    assert.ok(!String(request.path).includes(token))
  } finally {fake.restore()}
})

test('Story export rejects mismatched media responses instead of exposing them', async () => {
  const fake = stubImageServer('text/html')
  try {
    await assert.rejects(exportStoryMedia('owner', 'png'), /unexpected Story media format/)
  } finally {fake.restore()}
})

test('shareable PNG is the same completed 9:16 poster as the video, without movement', () => {
  const component = read('features/story/StoryShare.tsx')
  const renderer = read('../../../story-renderer/server.mjs')
  const story = read('features/story/StoryFrame.tsx')
  assert.ok(component.includes('aspect-[9/16]'))
  assert.ok(component.includes("exportStoryMedia(data.kind, 'png', token, controller.signal)"))
  assert.ok(component.includes("exportStoryMedia(data.kind, 'mp4', token, controller.signal)"))
  assert.ok(!component.includes('exportParolImage(data.kind, token, controller.signal)'))
  assert.ok(component.includes('BeMyParol-Story.png'))
  assert.ok(component.includes('BeMyParol-Story.mp4'))
  assert.ok(component.includes("image ? 'image/png' : 'video/mp4'"))
  assert.ok(component.includes('Completed 9:16 BeMyParol Story poster'))
  assert.ok(component.includes('<StoryFrame data={data} frame={200} preset="high"/>'))
  assert.ok(component.includes('background, festive border, branding and invitation text'))
  assert.match(renderer, /frame:200,\s*imageFormat:'png'/)
  assert.ok(renderer.includes("id:'BeMyParolStoryHigh'"))
  assert.ok(story.includes('A light from every friend'))
  assert.ok(story.includes('Find my invitation in the Link sticker'))
})

test('a different owner/link/guest or contribution cannot share previously generated media', () => {
  const component = read('features/story/StoryShare.tsx')
  assert.ok(component.includes("token ?? '', invitationUrl, data.designKey"))
  assert.ok(component.includes('sort((a,b) => a-b).join'))
  assert.ok(component.includes('latestDataKey.current !== requestedKey'))
  assert.ok(component.includes('mediaKey !== dataKey'))
  assert.ok(component.includes('pngKey === dataKey ? png : null'))
  assert.ok(component.includes('videoKey === dataKey ? video : null'))
  assert.ok(component.includes('setVideo(null)'))
  assert.ok(component.includes('setPng(null)'))
  assert.ok(component.includes('URL.revokeObjectURL(url)'))
})

test('native share remains user-selected with useful fallback and no platform login', () => {
  const component = read('features/story/StoryShare.tsx')
  assert.ok(component.includes('navigator.canShare?.({files: [file]})'))
  assert.ok(component.includes('navigator.share({files: [file]'))
  assert.ok(component.includes('Share image'))
  assert.ok(component.includes('Share video'))
  assert.ok(component.includes('Download PNG'))
  assert.ok(component.includes('Download MP4'))
  assert.ok(component.includes('Copy invitation link'))
  assert.ok(component.includes('Download the file and upload it'))
  assert.ok(!component.includes('facebookAccessToken'))
  assert.ok(!component.includes('instagramAccessToken'))
})

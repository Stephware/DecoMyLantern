import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fetchParolSnapshot} from '../src/lib/api.ts'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

function mockImageServer() {
  const previous = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options = {}) => {
    requests.push({url, options})
    if (String(url).endsWith('/csrf')) {
      return new Response(JSON.stringify({token:'csrf-zoom'}), {
        headers:{'content-type':'application/json'},
      })
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      headers:{'content-type':'image/webp'},
    })
  }
  return {requests, restore:()=>{globalThis.fetch=previous}}
}

test('normal owner and guest images keep the old request and do not request 2x', async () => {
  const server = mockImageServer()
  try {
    await fetchParolSnapshot('owner')
    await fetchParolSnapshot('guest', 'A'.repeat(16))
    assert.equal(server.requests[1].url, '/api/my/lantern/image')
    assert.deepEqual(JSON.parse(server.requests[1].options.body), {format:'webp'})
    assert.equal(server.requests[3].url, '/api/invitations/image')
    assert.deepEqual(JSON.parse(server.requests[3].options.body),
      {token:'A'.repeat(16),format:'webp'})
  } finally {server.restore()}
})

test('zoomed owner and invited guest request 2x via existing secured WebP endpoint', async () => {
  const server = mockImageServer()
  try {
    await fetchParolSnapshot('owner',undefined,undefined,'webp',2)
    await fetchParolSnapshot('guest','A'.repeat(16),undefined,'webp',2)
    for (const item of [server.requests[1],server.requests[3]]) {
      assert.equal(item.options.method,'POST')
      assert.equal(item.options.credentials,'same-origin')
      assert.equal(item.options.headers['X-CSRF-TOKEN'],'csrf-zoom')
      assert.equal(item.options.cache,'no-store')
      assert.equal(JSON.parse(item.options.body).scale,2)
    }
    assert.equal(server.requests[1].url,'/api/my/lantern/image')
    assert.equal(server.requests[3].url,'/api/invitations/image')
    assert.equal(JSON.parse(server.requests[3].options.body).token,'A'.repeat(16))
  } finally {server.restore()}
})

test('zoom upgrades never replace existing real-parol zoom or growth interactions', () => {
  const viewer = read('src/features/lantern/renderer/CachedParolScene.tsx')
  const snapshot = read('src/features/lantern/renderer/ParolSnapshot.tsx')
  const main = read('src/features/lantern/renderer/LanternScene.tsx')
  assert.ok(viewer.includes('HIGH_RES_ZOOM_THRESHOLD = 1.75'))
  assert.ok(viewer.includes('HIGH_RES_DEBOUNCE_MS = 400'))
  assert.ok(viewer.includes("controller.signal, 'webp', 2"))
  assert.ok(viewer.includes('standardReady'))
  assert.ok(viewer.includes('highRes?.key === visibleImage?.key'))
  assert.ok(viewer.includes('image.decode()'))
  assert.ok(viewer.includes('controller.abort()'))
  assert.ok(viewer.includes('URL.revokeObjectURL(url)'))
  assert.ok(viewer.includes('<image href={displayedImageUrl}'))
  assert.ok(viewer.includes('onPointerDown={pointerDown}'))
  assert.ok(viewer.includes('onPointerMove={pointerMove}'))
  assert.ok(viewer.includes('onClick={selectLight}'))
  assert.ok(viewer.includes('aria-label="Fit the whole lantern"'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_DURATIONS_MS[transition.wave - 1]'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_RADIUS[activeWave.wave]'))
  assert.ok(main.includes('<CachedParolScene'))
  assert.ok(snapshot.includes('<ProceduralOuterShell'))
  assert.ok(snapshot.includes('<ParolArtwork'))
})

test('renderer renders real 2x pixels, with the same geometry and bounded cache', () => {
  const renderer = read('../story-renderer/server.mjs')
  const keys = read('../story-renderer/parolImage.mjs')
  const api = read('../src/backend/DecoMyLantern.Api/Controllers/ParolImageController.cs')
  assert.ok(renderer.includes('const scale = request.scale === 2 ? 2 : 1'))
  assert.ok(renderer.includes("frame: 0, imageFormat: 'png', scale"))
  assert.ok(renderer.includes('sharp(tmpPng).webp({quality: 86, effort: 4})'))
  assert.ok(renderer.includes('cachedInfo?.isFile()'))
  assert.ok(renderer.includes('slice(128)'))
  assert.ok(renderer.includes('24 * 60 * 60 * 1000'))
  assert.ok(keys.includes('...(input.scale === 2 ? {scale: 2} : {})'))
  assert.ok(keys.includes("input.scale !== 2 || input.format === 'webp'"))
  assert.ok(api.includes('[Range(1, 2)]'))
  assert.ok(api.includes('request.Format, request.Scale'))
  assert.ok(api.includes('maximumImageBytes = 12 * 1024 * 1024'))
  assert.ok(api.includes('antiforgery.ValidateRequestAsync(HttpContext)'))
  assert.ok(api.includes('InvitationImage('))
})

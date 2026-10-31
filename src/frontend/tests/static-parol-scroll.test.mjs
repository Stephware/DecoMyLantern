import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = relativePath => readFileSync(new URL('../' + relativePath, import.meta.url), 'utf8')

test('public welcome parol is an approved static asset, not a drag-enabled renderer', () => {
  const welcome = read('src/features/owner/WelcomePage.tsx')
  const asset = read('public/parol-classic-preview.svg')
  const downtime = read('../../downtime/index.html')
  assert.ok(welcome.includes('src="/parol-classic-preview.svg"'))
  assert.ok(welcome.includes('draggable={false}'))
  assert.ok(welcome.includes('pointer-events-none'))
  assert.ok(!welcome.includes('<LanternScene'))
  assert.ok(!welcome.includes('LegacyLanternPreview'))
  assert.ok(!welcome.includes('previewCount={5}'))
  assert.match(asset, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.match(asset, /data-design="classic" data-friends="0"/)
  assert.ok(downtime.includes(asset.trim()), 'welcome parol must match the approved downtime parol exactly')
  assert.doesNotMatch(asset, /<script\b|<animate\b|onpointer|ontouch|http[s]?:\/\/(?!www\.w3\.org\/2000\/svg)/)
})

test('owner and guest show saved protected WebP as fixed image with native scrolling', () => {
  const viewer = read('src/features/lantern/renderer/CachedParolScene.tsx')
  const wrapper = read('src/features/lantern/renderer/LanternScene.tsx')
  const owner = read('src/features/dashboard/HostDashboard.tsx')
  const guest = read('src/features/invitations/GuestInvitationPage.tsx')
  assert.ok(wrapper.includes('<CachedParolScene'))
  assert.ok(owner.includes("snapshot={{kind:'owner',stateId:lantern.id}}"))
  assert.ok(guest.includes("snapshot={{kind:'guest',stateId:token,token}}"))
  assert.ok(viewer.includes('fetchParolSnapshot('))
  assert.ok(viewer.includes('<img src={visibleImage.url}'))
  assert.ok(viewer.includes('draggable={false}'))
  assert.ok(viewer.includes('pointer-events-none absolute inset-0'))
  for (const trap of ['onPointerDown=', 'onPointerMove=', 'setPointerCapture(', "touchAction:'none'", 'touchAction: \'none\'', 'cursor-grab', 'setCamera(', 'Zoom in', 'Zoom out']) {
    assert.ok(!viewer.includes(trap), `unexpected drag/zoom or scroll trap: ${trap}`)
  }
})

test('static saved-image presentation keeps updates and reveal animation', () => {
  const viewer = read('src/features/lantern/renderer/CachedParolScene.tsx')
  const snapshot = read('src/features/lantern/renderer/snapshotState.ts')
  assert.ok(viewer.includes('snapshotRequestKey('))
  assert.ok(snapshot.includes('designKey, patternKey, friendCount'))
  assert.ok(viewer.includes('shouldAnimateSnapshot(previous, next'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_DURATIONS_MS[transition.wave - 1]'))
  assert.ok(viewer.includes('<img src={activeWave.next.url}'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_RADIUS[activeWave.wave]'))
  assert.ok(viewer.includes('className="parol-snapshot-wave-glint"'))
  assert.ok(viewer.includes('controller.abort()'))
  assert.ok(viewer.includes('URL.revokeObjectURL(url)'))
  assert.ok(viewer.includes('onClick={() => setAttempt(n => n + 1)}>Retry</button>'))
  assert.ok(!viewer.includes('<ProceduralOuterShell'))
  assert.ok(!viewer.includes('<ParolArtwork'))
})

test('admin design lab stays available separately, without being placed on welcome page', () => {
  const wrapper = read('src/features/lantern/renderer/LanternScene.tsx')
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  const lab = read('src/features/lantern/renderer/LegacyLanternPreview.tsx')
  assert.ok(wrapper.includes("lazy(() => import('./LegacyLanternPreview'))"))
  assert.ok(dashboard.includes('lantern.isAdmin && <section'))
  assert.ok(dashboard.includes('previewCount={previewCount}'))
  assert.ok(lab.includes('<ProceduralOuterShell'))
})

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = relativePath => readFileSync(new URL('../' + relativePath, import.meta.url), 'utf8')

test('welcome page alone uses an approved static, non-draggable parol image', () => {
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
  assert.ok(downtime.includes(asset.trim()), 'welcome image must reuse approved Classic Gold parol')
  assert.doesNotMatch(asset, /<script\b|<animate\b|onpointer|ontouch|http[s]?:\/\/(?!www\.w3\.org\/2000\/svg)/)
})

test('owner and guest actual parol keeps interactive saved viewer and growth reveal', () => {
  const viewer = read('src/features/lantern/renderer/CachedParolScene.tsx')
  const wrapper = read('src/features/lantern/renderer/LanternScene.tsx')
  const owner = read('src/features/dashboard/HostDashboard.tsx')
  const guest = read('src/features/invitations/GuestInvitationPage.tsx')
  assert.ok(wrapper.includes('<CachedParolScene'))
  assert.ok(owner.includes("snapshot={{kind:'owner',stateId:lantern.id}}"))
  assert.ok(guest.includes("snapshot={{kind:'guest',stateId:token,token}}"))
  assert.ok(viewer.includes('fetchParolSnapshot('))
  assert.ok(viewer.includes('<image href={visibleImage.url}'))
  assert.ok(viewer.includes('<image href={activeWave.next.url}'))
  assert.ok(viewer.includes('shouldAnimateSnapshot(previous, next'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_DURATIONS_MS[transition.wave - 1]'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_RADIUS[activeWave.wave]'))
  assert.ok(viewer.includes('onPointerDown={pointerDown}'))
  assert.ok(viewer.includes('onPointerMove={pointerMove}'))
  assert.ok(viewer.includes('onClick={selectLight}'))
  assert.ok(viewer.includes("touchAction:'none'"))
  assert.ok(viewer.includes('aria-label="Zoom in"'))
  assert.ok(viewer.includes('aria-label="Zoom out"'))
  assert.ok(viewer.includes('aria-label="Fit the whole lantern"'))
})

test('interactive Design Lab remains separate from the static welcome page', () => {
  const wrapper = read('src/features/lantern/renderer/LanternScene.tsx')
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  const lab = read('src/features/lantern/renderer/LegacyLanternPreview.tsx')
  assert.ok(wrapper.includes("lazy(() => import('./LegacyLanternPreview'))"))
  assert.ok(dashboard.includes('lantern.isAdmin && <section'))
  assert.ok(dashboard.includes('previewCount={previewCount}'))
  assert.ok(lab.includes('<ProceduralOuterShell'))
})

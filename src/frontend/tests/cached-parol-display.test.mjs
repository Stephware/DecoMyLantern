import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {snapshotRequestKey} from '../src/features/lantern/renderer/snapshotState.ts'

const source = {kind:'owner', stateId:'lantern-a'}
const guest = {kind:'guest', stateId:'invite-a', token:'abcdefghijklmnop'}
const slots = [0, 1, 5]

function file(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8')
}

test('image is refreshed after actual growth, changed slots, design, or pattern', () => {
  const key = snapshotRequestKey(source, 'classic', 'default', 3, slots)
  assert.equal(key, snapshotRequestKey(source, 'classic', 'default', 3, [5,0,1]))
  assert.notEqual(key, snapshotRequestKey(source, 'classic', 'default', 4, [0,1,5,7]))
  assert.notEqual(key, snapshotRequestKey(source, 'classic', 'default', 3, [0,1,6]))
  assert.notEqual(key, snapshotRequestKey(source, 'floral', 'default', 3, slots))
  assert.notEqual(key, snapshotRequestKey(source, 'classic', 'rays', 3, slots))
  assert.notEqual(key, snapshotRequestKey({...source,stateId:'lantern-b'}, 'classic', 'default', 3, slots))
  assert.notEqual(key, snapshotRequestKey(guest, 'classic', 'default', 3, slots))
  assert.notEqual(snapshotRequestKey(guest,'classic','default',3,slots),
    snapshotRequestKey({...guest,token:'qrstuvwxyz012345'},'classic','default',3,slots))
})

test('real owner and guest views are a single cached image, not SVG geometry', () => {
  const wrapper = file('src/features/lantern/renderer/LanternScene.tsx')
  const viewer = file('src/features/lantern/renderer/CachedParolScene.tsx')
  const owner = file('src/features/dashboard/HostDashboard.tsx')
  const guestPage = file('src/features/invitations/GuestInvitationPage.tsx')
  assert.ok(wrapper.includes("lazy(() => import('./LegacyLanternPreview'))"))
  assert.ok(wrapper.includes('<CachedParolScene'))
  assert.ok(!wrapper.includes('<ProceduralOuterShell'))
  assert.ok(viewer.includes('<image href={rendered.url}'))
  assert.ok(viewer.includes('fetchParolSnapshot('))
  assert.ok(viewer.includes('URL.revokeObjectURL(url)'))
  assert.ok(viewer.includes('controller.abort()'))
  assert.ok(viewer.includes('caught.status === 503'))
  assert.ok(viewer.includes("snapshotRequestKey("))
  assert.ok(!viewer.includes('ProceduralOuterShell'))
  assert.ok(!viewer.includes('<ParolArtwork'))
  assert.ok(owner.includes("snapshot={{kind:'owner', stateId:lantern.id}}"))
  assert.ok(owner.includes('theme={savedTheme} pattern={lantern.patternKey}'))
  assert.ok(guestPage.includes("snapshot={{kind:'guest',stateId:token,token}}"))
})

test('saved image request uses secure private API with CSRF and WebP', () => {
  const api = file('src/lib/api.ts')
  assert.ok(api.includes("export async function fetchParolSnapshot("))
  assert.ok(api.includes("'/api/my/lantern/image'"))
  assert.ok(api.includes("'/api/invitations/image'"))
  assert.ok(api.includes("format:'webp'"))
  assert.ok(api.includes("'X-CSRF-TOKEN':csrf"))
  assert.ok(api.includes("credentials: 'same-origin'"))
  assert.ok(api.includes("'image/webp'"))
  assert.ok(!api.includes('URL.createObjectURL(await response.blob())'))
})

test('approved artwork and 3-wave preview remain available separately', () => {
  const legacy = file('src/features/lantern/renderer/LegacyLanternPreview.tsx')
  const snapshot = file('src/features/lantern/renderer/ParolSnapshot.tsx')
  assert.ok(legacy.includes('<ProceduralOuterShell'))
  assert.ok(legacy.includes('growthCount={growthCount}'))
  assert.ok(snapshot.includes('<ProceduralOuterShell'))
  assert.ok(snapshot.includes('<ParolArtwork'))
  assert.ok(snapshot.includes('lightPosition(slot)'))
})

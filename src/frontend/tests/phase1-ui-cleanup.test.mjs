import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')

test('production owner dashboard does not expose the development testing lab', () => {
  const owner = read('features/dashboard/HostDashboard.tsx')
  assert.ok(owner.includes('{import.meta.env.DEV && <section'))
  assert.ok(owner.indexOf('{import.meta.env.DEV && <section') < owner.indexOf('Development testing lab'))
  assert.ok(owner.includes('showTestingLab'))
  assert.ok(owner.includes('previewCount={previewCount}'))
  assert.ok(owner.includes('snapshot={{kind:\'owner\',stateId:lantern.id}}'))
})

test('owner summary focuses on friends and milestone, not technical growth counters', () => {
  const owner = read('features/dashboard/HostDashboard.tsx')
  const publicScreen = owner.split('{import.meta.env.DEV && <section')[0]
  assert.ok(publicScreen.includes('Friends joined'))
  assert.ok(publicScreen.includes('Grand parol'))
  assert.ok(publicScreen.includes('aria-label="Progress toward 50 friends"'))
  assert.ok(!publicScreen.includes('Three per friend'))
  assert.ok(!publicScreen.includes('growth milestone'))
  assert.ok(!publicScreen.includes('Growth layers</div>'))
  assert.ok(!publicScreen.includes('Drag to explore · Pinch to zoom'))
  assert.ok(publicScreen.includes('Christmas letters'))
  assert.ok(publicScreen.includes('Messages from friends stay private until Christmas Day.'))
})

test('guest and parol canvas hide technical diagnostics but keep usable controls', () => {
  const guest = read('features/invitations/GuestInvitationPage.tsx')
  const viewer = read('features/lantern/renderer/CachedParolScene.tsx')
  assert.ok(!guest.includes('real decorative layers'))
  assert.ok(!guest.includes('three decorative growth layers'))
  assert.ok(guest.includes('One light per browser.'))
  assert.ok(guest.includes('only visible to the parol owner'))
  assert.ok(guest.includes('Share your light.'))
  assert.ok(!viewer.includes('Saved parol image · Drag, pinch'))
  assert.ok(!viewer.includes('friends · {growthForFriends(friendCount)} growth layers'))
  assert.ok(!viewer.includes('Light #{selected.slotIndex'))
  assert.ok(viewer.includes('className="sr-only"'))
  assert.ok(viewer.includes('aria-label="Zoom in"'))
  assert.ok(viewer.includes('aria-label="Fit the whole lantern"'))
  assert.ok(viewer.includes('onClick={() => setAttempt(n => n + 1)}>Retry</button>'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_LABEL[activeWave.wave]'))
})

test('design previews remain explicit samples without repeating labels per card', () => {
  const panels = read('features/customization/DesignSelectionPanels.tsx')
  const gallery = read('features/customization/DesignShowcaseGallery.tsx')
  assert.ok(panels.includes('See each design at 50 friends.'))
  assert.ok(gallery.includes('fully grown with 50 sample friends'))
  assert.ok(!gallery.includes('50-friend preview'))
  assert.ok(!gallery.includes('150 growth layers'))
  assert.ok(gallery.includes('Retry previews'))
  assert.ok(gallery.includes('aria-pressed={isSelected}'))
})

test('sharing, recovery and accessibility remain functional', () => {
  const invite = read('features/invitations/InvitationManager.tsx')
  const story = read('features/story/StoryShare.tsx')
  const owner = read('features/dashboard/HostDashboard.tsx')
  const recovery = read('features/owner/RecoveryKeyDialog.tsx')
  assert.ok(invite.includes('Copy invitation link'))
  assert.ok(invite.includes('<StoryShare'))
  assert.ok(story.includes('Share video'))
  assert.ok(story.includes('Download MP4'))
  assert.ok(story.includes('Save static PNG instead'))
  assert.ok(!story.includes('1080 × 1920'))
  assert.ok(owner.includes('<RecoveryKeyDialog'))
  assert.ok(recovery.includes('Replacing invalidates the previous recovery key immediately'))
  assert.ok(recovery.includes('Copy recovery key'))
  assert.ok(recovery.includes('Valid until'))
  assert.ok(recovery.includes('Leave anyway'))
})

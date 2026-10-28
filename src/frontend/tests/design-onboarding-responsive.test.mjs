import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {THEMES} from '../src/features/customization/themes.ts'

const read = path => readFileSync(new URL('../src/' + path, import.meta.url),'utf8')

test('all six previously approved parol families remain available', () => {
  assert.deepEqual(THEMES.map(t => t.key),
    ['classic','floral','festival','celestial','fiesta','sampaguita'])
  assert.equal(new Set(THEMES.map(t => t.key)).size,6)
})

test('design previews show the final 50-friend state without touching owner records', () => {
  const api = readFileSync(new URL('../../../src/backend/DecoMyLantern.Api/Controllers/DesignShowcaseController.cs',
    import.meta.url),'utf8')
  assert.ok(api.includes('friendCount = 50'))
  assert.ok(api.includes('Enumerable.Range(0, 50).ToArray()'))
  assert.ok(api.includes('patternKey = "default"'))
  assert.ok(api.includes('IDesignService designs'))
  assert.ok(api.includes('GetEnabledAsync'))
  assert.ok(api.includes('format = "webp"'))
  assert.ok(!api.includes('ownerId'))
  assert.ok(!api.includes('GetAcceptedLights'))
  assert.ok(!api.includes('SetFriendCount'))
})

test('the onboarding picker occurs only after owner dashboard and recovery-key flow', () => {
  const dashboard=read('features/dashboard/HostDashboard.tsx')
  const app=read('app/App.tsx')
  assert.ok(app.includes("screen === 'recovery-key'"))
  assert.ok(app.includes('await finishOwnerSetup()'))
  assert.ok(dashboard.includes('ONBOARDING_PREFIX + lantern.id'))
  assert.ok(dashboard.includes('lantern.acceptedFriends === 0'))
  assert.ok(dashboard.includes('<FirstTimeDesignPicker'))
  assert.ok(dashboard.includes('if (changed) await onSave(draftDesign, draftPattern)'))
  assert.ok(dashboard.includes('markChoice()'))
  assert.ok(dashboard.includes('setDrawerOpen(false)'))
  assert.ok(dashboard.includes('localStorage.setItem(ONBOARDING_PREFIX + lantern.id'))
})

test('mobile drawer has handle, arrow, swipes, keyboard and an accessible save', () => {
  const panels=read('features/customization/DesignSelectionPanels.tsx')
  assert.ok(panels.includes('onTouchStart={onStart} onTouchEnd={onEnd}'))
  assert.ok(panels.includes('if (movement < -35) { swiped.current = true; onOpenChange(true) }'))
  assert.ok(panels.includes('else if (movement > 35) { swiped.current = true; onOpenChange(false) }'))
  assert.ok(panels.includes("event.key === 'Escape'"))
  assert.ok(panels.includes('aria-expanded={open}'))
  assert.ok(panels.includes('aria-controls="mobile-design-choices"'))
  assert.ok(panels.includes("open ? '↓ Close' : '↑ Designs'"))
  assert.ok(panels.includes('Save my design'))
  assert.ok(panels.includes('max-h-[84dvh]'))
})

test('gallery loads approved full-bloom images sequentially and lets users retry', () => {
  const gallery=read('features/customization/DesignShowcaseGallery.tsx')
  assert.ok(gallery.includes('for (const key of keys.split'))
  assert.ok(gallery.includes('/api/designs/'))
  assert.ok(gallery.includes('showcase?v='))
  assert.ok(gallery.includes('const artworkCache = new Map'))
  assert.ok(gallery.includes('50-friend preview'))
  assert.ok(gallery.includes('URL.revokeObjectURL(url)'))
  assert.ok(gallery.includes('Retry previews'))
  assert.ok(!gallery.includes('ProceduralOuterShell'))
})

test('cached real parol and approved artwork are preserved', () => {
  const dashboard=read('features/dashboard/HostDashboard.tsx')
  assert.ok(dashboard.includes("snapshot={{kind:'owner',stateId:lantern.id}}"))
  assert.ok(dashboard.includes('contributions={lantern.lights} friendCount={lantern.acceptedFriends}'))
  assert.ok(dashboard.includes('showTestingLab'))
  const guest=read('features/invitations/GuestInvitationPage.tsx')
  assert.ok(guest.includes("snapshot={{kind:'guest',stateId:token,token}}"))
  assert.ok(guest.includes('contributeInvitation(token, name.trim(), message.trim())'))
  assert.ok(guest.includes('preview?.alreadyContributed'))
})

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  shouldAutoReveal, canPreviewEarly, christmasRevealStorageKey,
} from '../src/features/dashboard/christmasRevealPolicy.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sealed = {
  unlocked:false, christmasDayReached:false,
  unlockAtUtc:'2026-12-24T16:00:00Z', messages: [
    {id:'a',displayName:'Friend',body:null,isLocked:true,createdAtUtc:'2026-11-01T00:00:00Z'},
  ],
}
const adminEarly = {...sealed, unlocked:true, messages:[
  {...sealed.messages[0], isLocked:false, body:'Private saved letter'},
]}
const christmas = {...adminEarly, christmasDayReached:true}

test('regular visitors cannot trigger reveal early, even when admin can read its own letters', () => {
  assert.equal(shouldAutoReveal(sealed, false), false)
  assert.equal(shouldAutoReveal(adminEarly, false), false)
  assert.equal(shouldAutoReveal(christmas, false), true)
  assert.equal(shouldAutoReveal(christmas, true), false)
  assert.equal(canPreviewEarly(false, adminEarly), false)
  assert.equal(canPreviewEarly(true, sealed), false)
  assert.equal(canPreviewEarly(true, adminEarly), true)
})

test('first-visit key is scoped to the particular parol and Christmas season', () => {
  const a = christmasRevealStorageKey('lantern-A',2026)
  assert.equal(a,christmasRevealStorageKey('lantern-A',2026))
  assert.notEqual(a,christmasRevealStorageKey('lantern-B',2026))
  assert.notEqual(a,christmasRevealStorageKey('lantern-A',2027))
})

test('Christmas animation is a fast, accessible and skippable overlay', () => {
  const dialog = read('src/features/dashboard/ChristmasRevealDialog.tsx')
  const styles = read('src/styles/index.css')
  assert.ok(dialog.includes('createPortal('))
  assert.ok(dialog.includes('role="dialog" aria-modal="true"'))
  assert.ok(dialog.includes('aria-labelledby="christmas-reveal-title"'))
  assert.ok(dialog.includes("event.key === 'Escape'"))
  assert.ok(dialog.includes("event.key === 'Tab'"))
  assert.ok(dialog.includes("document.body.style.overflow = 'hidden'"))
  assert.ok(dialog.includes("document.body.style.overflow = previousOverflow"))
  assert.ok(dialog.includes("prefers-reduced-motion: reduce"))
  assert.ok(dialog.includes("window.setTimeout(() => setStage(1), 750)"))
  assert.ok(dialog.includes("window.setTimeout(() => setStage(2), 2050)"))
  assert.ok(dialog.includes('Skip animation'))
  assert.ok(dialog.includes('Unwrap my Christmas messages'))
  assert.ok(dialog.includes('No Christmas messages yet'))
  assert.ok(dialog.includes('ADMIN PREVIEW'))
  assert.ok(!dialog.includes('VideoEncoder'))
  assert.ok(!dialog.includes('renderStill('))
  assert.ok(styles.includes('.christmas-reveal-count'))
  assert.ok(styles.includes('@media (prefers-reduced-motion: reduce)'))
})

test('normal owner dashboard shows locked messages and reveals only after server confirmation', () => {
  const scene = read('src/features/dashboard/ChristmasExperience.tsx')
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  assert.ok(scene.includes("getLanternMessages(lanternId, controller.signal)"))
  assert.ok(scene.includes('shouldAutoReveal(inbox, seen)'))
  assert.ok(scene.includes('christmasRevealStorageKey(lanternId, seasonYear)'))
  assert.ok(scene.includes("localStorage.setItem(key, 'seen')"))
  assert.ok(scene.includes('inbox.christmasDayReached'))
  assert.ok(scene.includes('Sealed until Christmas Day'))
  assert.ok(scene.includes('messages.slice(0, visibleCount)'))
  assert.ok(scene.includes('Show more letters'))
  assert.ok(scene.includes('letter.isLocked ?'))
  assert.ok(scene.includes('letter.body'))
  assert.ok(scene.includes("setRefresh(n => n + 1)"))
  assert.ok(scene.includes('controller.abort()'))
  assert.ok(dashboard.includes('<ChristmasExperience key={lantern.id}'))
})

test('early preview is strictly part of admin lab and uses its saved inbox', () => {
  const scene = read('src/features/dashboard/ChristmasExperience.tsx')
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  const api = read('src/lib/api.ts')
  assert.ok(scene.includes('canPreviewEarly(isAdmin, inbox)'))
  assert.ok(scene.includes('adminPreviewSignal === handledAdminPreview.current'))
  assert.ok(scene.includes('setPreview(!inbox.christmasDayReached)'))
  assert.ok(dashboard.includes('Preview Christmas message reveal'))
  assert.ok(dashboard.includes('{lantern.isAdmin && <section'))
  assert.ok(dashboard.includes('adminPreviewSignal={adminChristmasPreviewSignal}'))
  assert.ok(api.includes('christmasDayReached: boolean'))
  assert.ok(api.includes("getLanternMessages = (lanternId: string, signal?: AbortSignal)"))
})

test('admin lab uses real cached 1x/2x/3x renderer but cannot modify saved friend data', () => {
  const lab = read('src/features/lantern/renderer/AdminCachedParolPreview.tsx')
  const cached = read('src/features/lantern/renderer/CachedParolScene.tsx')
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  const api = read('src/lib/api.ts')
  assert.ok(lab.includes('setTimeout(() => setSelection({theme, pattern, friendCount}), 300)'))
  assert.ok(lab.includes('adminPreview'))
  assert.ok(lab.includes('CachedParolScene'))
  assert.ok(!lab.includes('ProceduralOuterShell'))
  assert.ok(dashboard.includes('AdminCachedParolPreview'))
  assert.ok(cached.includes('fetchAdminParolPreview(theme.key, friendCount, controller.signal)'))
  assert.ok(cached.includes('fetchAdminParolPreview(theme.key, friendCount, controller.signal, desiredScale)'))
  assert.ok(cached.includes("adminPreview ? 'admin-preview|'"))
  assert.ok(cached.includes('ULTRA_RES_ZOOM_THRESHOLD = 3'))
  assert.ok(cached.includes('HIGH_RES_ZOOM_THRESHOLD = 1.75'))
  assert.ok(api.includes("'/api/my/lantern/admin-preview/image'"))
  assert.ok(api.includes("...(scale > 1 ? {scale} : {})"))
})

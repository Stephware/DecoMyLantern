import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Phase 1: diagnostic testing controls remain development-only', () => {
  const dashboard = read('src/features/dashboard/HostDashboard.tsx')
  const marker = dashboard.indexOf('{import.meta.env.DEV && <section')
  assert.ok(marker >= 0, 'development lab must remain guarded')
  assert.ok(dashboard.indexOf('Development testing lab') > marker)
  const publicPortion = dashboard.slice(0, marker)
  assert.doesNotMatch(publicPortion, /Growth layers<\/div>|Three per friend/)
  assert.match(publicPortion, /Friends joined/)
})

test('Phases 2–3: owner and invited guest share the saved parol through the same UI', () => {
  const share = read('src/features/story/StoryShare.tsx')
  const owner = read('src/features/invitations/InvitationManager.tsx')
  const guest = read('src/features/invitations/GuestInvitationPage.tsx')
  const api = read('src/lib/api.ts')
  assert.ok(owner.includes('<StoryShare'))
  assert.ok(guest.includes('<StoryShare'))
  assert.ok(guest.includes('alreadyContributed ? ('))
  assert.ok(share.includes("exportParolImage(data.kind, token, controller.signal)"))
  assert.ok(share.includes("exportStoryMedia(data.kind, 'mp4', token, controller.signal)"))
  assert.ok(share.includes('navigator.canShare'))
  assert.ok(share.includes('navigator.share'))
  assert.ok(share.includes('Download PNG'))
  assert.ok(share.includes('Download MP4'))
  assert.ok(share.includes('Copy invitation link'))
  assert.ok(api.includes("guest ? '/api/invitations/image' : '/api/my/lantern/image'"))
  assert.ok(api.includes("'X-CSRF-TOKEN':csrf"))
  assert.ok(api.includes("credentials: 'same-origin'"))
  assert.doesNotMatch(share, /instagramAccessToken|facebookAccessToken/)
})

test('Phase 3: parol PNG and animated Story are different media files', () => {
  const share = read('src/features/story/StoryShare.tsx')
  const poster = read('src/features/story/StoryFrame.tsx')
  const snapshot = read('src/features/lantern/renderer/ParolSnapshot.tsx')
  assert.ok(share.includes('BeMyParol-Parol.png'))
  assert.ok(share.includes('BeMyParol-Story.mp4'))
  assert.ok(share.includes("'aspect-[15/16]' : 'aspect-[9/16]'"))
  assert.ok(poster.includes('<ProceduralOuterShell'))
  assert.ok(snapshot.includes('<ProceduralOuterShell'))
  assert.ok(snapshot.includes('<ParolArtwork'))
  assert.ok(snapshot.includes('background: \'transparent\''))
})

test('Phase 1/6: shared Story text stays friendly, not technical', () => {
  const poster = read('src/features/story/StoryFrame.tsx')
  assert.ok(poster.includes("data.friendCount === 1 ? 'friend' : 'friends'"))
  assert.doesNotMatch(poster, /Story layers|Growth layers|debug|simulation/i)
  assert.ok(poster.includes('I added my light!'))
  assert.ok(poster.includes('Help my parol shine!'))
  assert.ok(poster.includes('storyGrowthAtFrame(data.friendCount, frame)'))
})

test('Phase 4: exports cannot leak obsolete media or loop forever on failure', () => {
  const share = read('src/features/story/StoryShare.tsx')
  const retry = read('src/features/story/mediaExportTask.ts')
  assert.ok(share.includes('if (activeRequest.current) return'))
  assert.ok(share.includes('latestDataKey.current !== requestedKey'))
  assert.ok(share.includes('activeRequest.current !== request'))
  assert.ok(share.includes('current.controller.abort()'))
  assert.ok(share.includes('mediaKey !== dataKey'))
  assert.ok(share.includes('Cancel preparation'))
  assert.ok(retry.includes('retriesUsed <= 2'))
  assert.ok(retry.includes('error.status === 503 || error.status === 504'))
  assert.doesNotMatch(retry, /localStorage|sessionStorage|IndexedDB/)
})

test('Phase 5: independent downtime page has canonical parol and Filipino text', () => {
  const page = read('../../downtime/index.html')
  assert.match(page, /Salamat sa pasensya ✦/)
  assert.match(page, /data-design="classic" data-friends="0"/)
  assert.match(page, /data-part="festival-mini-parol"/)
  assert.match(page, /data-part="living-outer-shell"/)
  assert.match(page, /<a class="retry" href="\/">Try again<\/a>/)
  assert.doesNotMatch(page, /<(?:script|link|img|iframe)\b|@import|@font-face/i)
  assert.doesNotMatch(page, /adsbygoogle|googlesyndication|cloudflared/i)
})

test('owner private recovery key remains separate from public Story and guest art', () => {
  const modal = read('src/features/owner/RecoveryKeyDialog.tsx')
  const poster = read('src/features/story/StoryFrame.tsx')
  const snapshot = read('src/features/lantern/renderer/ParolSnapshot.tsx')
  assert.ok(modal.includes('Copy recovery key'))
  assert.ok(modal.includes('Leave anyway'))
  assert.doesNotMatch(poster, /recoveryCode|recoveryKey|displayName|messageBody/)
  assert.doesNotMatch(snapshot, /recoveryCode|recoveryKey|displayName|messageBody/)
})

test('legacy development preview closes the selected friend caption before the status caption', () => {
  const preview = read('src/features/lantern/renderer/LegacyLanternPreview.tsx')
  assert.match(preview, /\{selected && <figcaption[\s\S]*?<\/figcaption>\}/)
  assert.match(preview, /<figcaption role="status" aria-live="polite"/)
})

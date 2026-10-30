import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
const backend = file => readFileSync(new URL('../../../src/backend/DecoMyLantern.Api/' + file, import.meta.url), 'utf8')

test('owner header shows recovery key beside leave and requires the popup before sign out', () => {
  const code = read('features/dashboard/HostDashboard.tsx')
  const posKey = code.indexOf('Recovery key\n')
  const posLeave = code.indexOf('Leave parol\n')
  assert.ok(posKey >= 0 && posLeave > posKey)
  assert.ok(code.includes("setRecoveryDialog('view')"))
  assert.ok(code.includes("setRecoveryDialog('leave')"))
  assert.ok(code.includes('<RecoveryKeyDialog mode={recoveryDialog}'))
  assert.ok(code.includes('onLeave={signOut}'))
  assert.ok(!code.includes('window.confirm(\'Have you saved your recovery key'))
})

test('the recovery popup fetches a private code on demand and never stores it locally', () => {
  const dialog = read('features/owner/RecoveryKeyDialog.tsx')
  const api = read('lib/api.ts')
  assert.ok(dialog.includes('getOwnerRecoveryKey()'))
  assert.ok(dialog.includes('navigator.clipboard.writeText(code)'))
  assert.ok(dialog.includes("mode === 'leave'"))
  assert.ok(dialog.includes("'Leave anyway'"))
  assert.ok(dialog.includes('replaceOwnerRecoveryKey()'))
  assert.ok(dialog.includes('previous recovery key'))
  // Comments document the privacy guarantee, so inspect executable source only.
  const executable = dialog.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  assert.doesNotMatch(executable, /\blocalStorage\b|\bsessionStorage\b/)
  assert.ok(api.includes("'/api/owner/recovery-key', { method: 'POST' }"))
  assert.ok(api.includes("'/api/owner/replace-recovery-key', { method: 'POST' }"))
})

test('existing decorative patterns remain compatible but pattern controls are hidden', () => {
  const dashboard = read('features/dashboard/HostDashboard.tsx')
  const sheet = read('features/customization/DesignSelectionPanels.tsx')
  assert.ok(!dashboard.includes('PATTERNS'))
  assert.ok(!dashboard.includes('Decorative pattern'))
  assert.ok(!sheet.includes('PATTERNS'))
  assert.ok(!sheet.includes('Decorative pattern'))
  assert.ok(dashboard.includes('onSave(draftDesign, lantern.patternKey)'))
  assert.ok(dashboard.includes('pattern={lantern.patternKey}'))
})

test('invitation link is visible and copy-only while Story remains separate', () => {
  const invitations = read('features/invitations/InvitationManager.tsx')
  assert.ok(invitations.includes('id="invitation-url"'))
  assert.ok(invitations.includes('Copy invitation link'))
  assert.ok(invitations.includes('navigator.clipboard.writeText(url)'))
  assert.ok(!invitations.includes('View / share'))
  assert.ok(!invitations.includes('showLinkPage'))
  assert.ok(!invitations.includes('showInvitation()'))
  assert.ok(invitations.includes('Share your parol Story'))
})

test('guest contribution uses share your light wording without changing API', () => {
  const guest = read('features/invitations/GuestInvitationPage.tsx')
  assert.ok(guest.includes('Share your light.'))
  assert.ok(guest.includes('Share my light ✦'))
  assert.ok(guest.includes('contributeInvitation(token, name.trim(), message.trim())'))
  assert.ok(guest.includes('preview?.alreadyContributed'))
})

test('recovery endpoints require protected owner session and CSRF', () => {
  const c = backend('Controllers/OwnerController.cs')
  assert.ok(c.includes('[EnableRateLimiting("owner-recovery-display")]'))
  assert.ok(c.includes('[EnableRateLimiting("owner-recovery-replace")]'))
  assert.ok(c.includes('[HttpPost("recovery-key")]'))
  assert.ok(c.includes('[HttpPost("replace-recovery-key")]'))
  assert.ok(c.includes('if (!await ValidCsrfAsync())'))
  assert.ok(c.includes('if (!TryOwner(out var id)) return Unauthorized()'))
  assert.ok(c.includes('NoStore()'))
})

test('existing legacy owner hashes are not silently replaced', () => {
  const service = backend('Services/Owner/OwnerAccessService.cs')
  assert.ok(service.includes('if (credential.EncryptedRecoveryCode is null)'))
  assert.ok(service.includes('credential.EncryptedRecoveryCode = recoveryCipher.Protect(recoveryCode, credential.OwnerUserId)'))
  assert.ok(service.includes('public async Task<OwnerRecoveryKeyView> ReplaceRecoveryKeyAsync'))
  assert.ok(service.includes('credential.RecoveryHash = Hash(code)'))
  assert.ok(service.includes('credential.RecoveryIssuedAtUtc = now'))
  assert.ok(service.includes('credential.RecoveryExpiresAtUtc = now.Add(OwnerSession.RecoveryLifetime)'))
  assert.ok(service.includes('public async Task<OwnerRecoveryKeyView> GetRecoveryKeyAsync'))
})

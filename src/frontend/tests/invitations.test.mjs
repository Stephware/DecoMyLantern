import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  invitationTokenFromHash, invitationUrl, isValidInvitationToken,
} from '../src/features/invitations/invitationLinks.ts'

const secret = 'A'.repeat(16)

test('a shareable invitation is a URL fragment, never a query string', () => {
  const link = invitationUrl('https://bemyparol.site', secret)
  const parsed = new URL(link)
  assert.equal(parsed.origin, 'https://bemyparol.site')
  assert.equal(parsed.pathname, '/')
  assert.equal(parsed.search, '')
  assert.equal(parsed.hash, `#/i/${secret}`)
  assert.equal(invitationTokenFromHash(parsed.hash), secret)
})

test('only strict 96-bit invitation-token string shapes are accepted', () => {
  assert.ok(isValidInvitationToken(secret))
  assert.ok(isValidInvitationToken('_'.repeat(16)))
  assert.ok(isValidInvitationToken('-'.repeat(16)))
  for (const invalid of ['', 'x'.repeat(15), 'x'.repeat(17), 'x'.repeat(43), 'xyz?', '../../owner', '<script>']) {
    assert.equal(isValidInvitationToken(invalid), false)
    assert.throws(() => invitationUrl('https://bemyparol.site', invalid))
  }
})

test('other app fragments cannot be misidentified as invitation links', () => {
  assert.equal(invitationTokenFromHash(''), null)
  assert.equal(invitationTokenFromHash('#/owner'), null)
  assert.equal(invitationTokenFromHash('#/i/' + secret), secret)
  assert.equal(invitationTokenFromHash('#/invite/' + 'A'.repeat(43)), 'A'.repeat(43))
  assert.equal(invitationTokenFromHash('#/i/invalid'), 'invalid')
  assert.equal(isValidInvitationToken('A'.repeat(43)), false)
})

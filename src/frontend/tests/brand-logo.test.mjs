import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('approved standalone parol logo is a compact PNG asset with no wordmark', () => {
  const logo = readFileSync(new URL('../public/bemyparol-logo.png', import.meta.url))
  assert.ok(logo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
  assert.ok(logo.length < 20_000)
  assert.equal(logo.readUInt32BE(16), 160)
  assert.equal(logo.readUInt32BE(20), 160)
})

test('favicon, guest and owner headers all use the same approved symbol', () => {
  const index = source('index.html')
  const pages = [
    'src/features/owner/WelcomePage.tsx',
    'src/features/owner/RecoveryKeyPage.tsx',
    'src/features/dashboard/HostDashboard.tsx',
    'src/features/invitations/GuestInvitationPage.tsx',
    'src/app/App.tsx',
  ]
  assert.ok(index.includes('href="/bemyparol-logo.png"'))
  for (const page of pages) {
    const text = source(page)
    assert.ok(text.includes('src="/bemyparol-logo.png"'), page)
    assert.ok(text.includes('alt=""'), page)
  }
})

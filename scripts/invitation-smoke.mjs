#!/usr/bin/env node
/**
 * DESTRUCTIVE development-only integration test.
 * Creates new owners and 51 guest contributions in a LOCAL SQL Server database.
 * Run only against a disposable, migrated dev instance: never production.
 * Usage from repo root: node scripts/invitation-smoke.mjs --confirm-dev-database
 */
import { strict as assert } from 'node:assert'

const base = process.env.BEMYPAROL_TEST_API ?? 'http://localhost:5050'
const parsed = new URL(base)
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
    !['http:', 'https:'].includes(parsed.protocol) ||
    !process.argv.includes('--confirm-dev-database')) {
  throw new Error('Refusing to write test contributions. Use localhost and --confirm-dev-database only.')
}

class Browser {
  constructor() { this.cookies = new Map() }

  async call(path, method = 'GET', body = undefined, csrfPath = undefined) {
    const headers = new Headers()
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (csrfPath) {
      const csrf = await this.call(csrfPath)
      assert.equal(csrf.status, 200, 'CSRF initialization failed')
      headers.set('X-CSRF-TOKEN', csrf.data.token)
    }
    if (this.cookies.size) {
      headers.set('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '))
    }
    const response = await fetch(new URL(path, base), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
      cache: 'no-store',
    })
    for (const cookie of response.headers.getSetCookie()) {
      const [part] = cookie.split(';')
      const eq = part.indexOf('=')
      if (eq > 0) {
        const key = part.slice(0, eq)
        const value = part.slice(eq + 1)
        if (value) this.cookies.set(key, value)
        else this.cookies.delete(key)
      }
    }
    const raw = await response.text()
    let data = null
    try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
    return { status: response.status, data }
  }

  ownerPost(path, body) { return this.call(path, 'POST', body, '/api/owner/csrf') }
  guestPost(path, body) { return this.call(path, 'POST', body, '/api/invitations/csrf') }
  ownerDelete(path) { return this.call(path, 'DELETE', undefined, '/api/owner/csrf') }
}

function ok(response, status, step) {
  assert.equal(response.status, status, `${step}: status ${response.status} ${JSON.stringify(response.data)}`)
  return response.data
}

const owner = new Browser()
const issuedOwner = ok(await owner.ownerPost('/api/owner/create'), 201, 'create owner')
assert.equal(typeof issuedOwner.recoveryCode, 'string')
const lantern = ok(await owner.call('/api/my/lantern'), 200, 'get owner parol')
assert.equal(lantern.acceptedFriends, 0)

const invitation = ok(await owner.ownerPost('/api/my/lantern/invitations'), 200, 'create invite')
assert.equal(invitation.token.length, 43)
const ownerLinks = ok(await owner.call('/api/my/lantern/invitations'), 200, 'owner invite list')
assert.ok(ownerLinks.some(link => link.id === invitation.id))

const guests = []
async function friend(number) {
  const guest = new Browser()
  const preview = ok(
    await guest.guestPost('/api/invitations/preview', { token: invitation.token }),
    200, `friend ${number} preview`)
  assert.equal(preview.alreadyContributed, false)
  assert.equal(preview.lights.length, number - 1)
  assert.ok(!JSON.stringify(preview).includes('recoveryCode'))
  assert.ok(!JSON.stringify(preview).includes('body'))

  const contribution = ok(
    await guest.guestPost('/api/invitations/contribute', {
      token: invitation.token,
      displayName: `Guest ${number}`,
      message: number === 1 ? 'A private Christmas wish' : '',
    }),
    201, `friend ${number} contribution`)
  assert.equal(contribution.parol.alreadyContributed, true)
  assert.equal(contribution.parol.acceptedFriends, number)
  assert.equal(contribution.slotIndex, number - 1)
  guests.push(guest)
}

for (let n = 1; n <= 49; n++) await friend(n)

const concurrent = [new Browser(), new Browser()]
const both = await Promise.all(concurrent.map((guest, i) =>
  guest.guestPost('/api/invitations/contribute', {
    token: invitation.token,
    displayName: `Concurrent guest ${i + 1}`,
    message: 'Happy Pasko!',
  })))
both.forEach((response, i) => ok(response, 201, `concurrent guest ${i + 1}`))
assert.deepEqual(both.map(x => x.data.slotIndex).sort((a,b)=>a-b), [49, 50])
assert.ok(both.every(x => x.data.parol.acceptedFriends >= 50 && x.data.parol.acceptedFriends <= 51), 'concurrent previews show final or near-final count')

const after = ok(await owner.call('/api/my/lantern'), 200, 'owner sees 51 lights')
assert.equal(after.acceptedFriends, 51)
assert.equal(after.lights.length, 51)
assert.equal(new Set(after.lights.map(x => x.slotIndex)).size, 51)
assert.deepEqual(after.lights.map(x => x.slotIndex), Array.from({ length: 51 }, (_, i) => i))
assert.equal(after.growthStage, 'grand')

const duplicate = await guests[0].guestPost('/api/invitations/contribute', {
  token: invitation.token,
  displayName: 'Duplicate attempt',
  message: 'Duplicate message',
})
assert.equal(duplicate.status, 409, 'duplicate browser contribution rejected')
const still51 = ok(await owner.call('/api/my/lantern'), 200, 'count after duplicate')
assert.equal(still51.acceptedFriends, 51)

const secondOwner = new Browser()
ok(await secondOwner.ownerPost('/api/owner/create'), 201, 'create second owner')
const unauthorizedRevoke = await secondOwner.ownerDelete(
  `/api/my/lantern/invitations/${invitation.id}`)
assert.equal(unauthorizedRevoke.status, 404, 'other owner cannot revoke invite')

const inbox = ok(await owner.call(`/api/my/lanterns/${lantern.id}/messages`), 200, 'owner inbox')
if (!inbox.unlocked) {
  assert.ok(inbox.messages.length >= 1)
  assert.ok(inbox.messages.every(letter => letter.body === null), 'no early Christmas message text')
}
const guestInbox = await guests[0].call(`/api/my/lanterns/${lantern.id}/messages`)
assert.equal(guestInbox.status, 401, 'guest never receives owner inbox')

ok(await owner.ownerDelete(`/api/my/lantern/invitations/${invitation.id}`), 204, 'revoke invite')
const afterRevokeGuest = new Browser()
const revoked = await afterRevokeGuest.guestPost('/api/invitations/preview', { token: invitation.token })
assert.equal(revoked.status, 404, 'revoked invite cannot resolve')
assert.equal(ok(await owner.call('/api/my/lantern'), 200, 'retained lights').acceptedFriends, 51)

console.log('PASS: owner links, 49 sequential + 2 concurrent guests (51 total), unique stable slots,')
console.log('duplicate rejection, owner isolation, Christmas inbox redaction and link revocation.')
console.log('All records were inserted into your disposable LOCAL development database.')
